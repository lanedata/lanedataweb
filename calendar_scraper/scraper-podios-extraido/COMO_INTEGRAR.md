# Cómo integrar los scrapers de `podios-stories` en tu scraper de competiciones

> Objetivo de este documento: que puedas **reutilizar la parte de scraping** de la
> herramienta de podios (rama `feature/podios-stories`) dentro de **tu** scraper —
> el que recorre las competiciones de todas las federaciones españolas y extrae,
> por competición, las pruebas que se disputan, enlaces a PDFs (inscritos /
> resultados / info), etc.
>
> **No toca nada de tu repo.** Todo lo de aquí es local: esta carpeta es una copia
> extraída de la rama, no está enganchada a git.

---

## 0. Qué hay en esta carpeta

```
scraper-podios-extraido/
├── COMO_INTEGRAR.md            ← este documento
├── ejemplo_dispatcher.py       ← ejemplo mínimo: URL → fuente → lista de pruebas
├── scrapers_originales/
│   ├── engine.py               Scraper conersyslive.es (+ utilidad nombre_corto)
│   ├── scraper_fam.py          Scraper atletismomadrid.com (FAM)
│   ├── scraper_rfea.py         Scraper rfealive.me
│   ├── scraper_rfea_es.py      Scraper rfealive.es (Blazor WASM → JSON gzip de S3)
│   ├── scraper_conersys.py     Versión ANTIGUA de engine.py (no usar, solo referencia)
│   ├── cruce.py                Utilidades compartidas (marca/viento/normalización)
│   └── requirements.txt        Dependencias Python
└── docs_originales/
    ├── PROYECTO.md             Doc técnica completa del proyecto original
    └── NOTAS_PROYECTO.md       Historial de decisiones y bugs (con fechas)
```

---

## 1. Lo importante en una frase

La herramienta de podios soporta **4 plataformas de resultados** distintas. Cada
una tiene su módulo porque cada web tiene una estructura diferente. Todas exponen
una función **`parse_schedule(url)`** (o equivalente) que, dada la URL del horario
de una competición, devuelve **la lista de pruebas** de esa competición. Eso es
justo lo que tú necesitas para "qué pruebas se disputan por competición".

| Plataforma | Módulo | Tecnología | Punto de entrada |
|---|---|---|---|
| `conersyslive.es` | `engine.py` | HTML estático (BeautifulSoup) | `parse_schedule(url)` → `(comp, eventos)` |
| `atletismomadrid.com` (FAM) | `scraper_fam.py` | HTML estático | `parse_index(html)` → `eventos` |
| `rfealive.me` | `scraper_rfea.py` | HTML estático (plantilla distinta) | `parse_schedule(url)` → `(comp, eventos)` |
| `rfealive.es` | `scraper_rfea_es.py` | **Blazor WASM → JSON gzip de S3** | `parse_schedule(url)` → `(comp, eventos)` |

> `scraper_conersys.py` es una versión vieja de `engine.py`, **no la uses**. Se
> incluye solo por si quieres comparar parsers.

---

## 2. Detección de fuente por URL (lo primero que necesitas)

La web original detecta la plataforma mirando qué dominio contiene la URL pegada.
Replica esto en tu scraper. **Cuidado con el orden**: `rfealive.es` y `rfealive.me`
comparten el prefijo `rfealive`, así que hay que discriminar por el dominio
completo (`.es` vs `.me`), no por la subcadena `rfealive`.

```python
def detectar_fuente(url: str) -> str:
    u = url.lower()
    if "conersyslive.es"   in u: return "conersys"
    if "atletismomadrid.com" in u: return "fam"
    if "rfealive.es"       in u: return "rfealive_es"   # Blazor + S3 (comprobar ANTES que .me)
    if "rfealive.me"       in u: return "rfealive_me"
    return "desconocida"
```

---

## 3. El formato de salida común (`eventos`)

Los 4 scrapers convergen en una **lista de pruebas** con estas claves (no todas las
fuentes rellenan todas — ver la columna "fuentes"):

| Clave | Significado | Fuentes que la traen |
|---|---|---|
| `nombre` | Nombre de la prueba (ej. `"100 m Hombres"`) | las 4 |
| `ronda` | `Final` / `Semifinal` / `Serie`… | conersys, rfealive.me/.es (FAM lo deja vacío) |
| `hora` | Hora de inicio (`HH:MM`) | conersys, fam, rfealive.me/.es |
| `fecha` | Fecha (`DD/MM/YYYY`, normalizada en las 4) | las 4 |
| `estado` | `Oficial` / `Provisional` / `Finalizado`… | fam, rfealive.es (conersys a veces; rfealive.me solo dentro del resultado) |
| `key` | Identificador interno de la prueba | conersys, rfealive.me |
| `url` | Enlace a la página de resultados de la prueba | conersys, fam, rfealive.me |
| `podio` | Top-3 (solo en rfealive.es viene ya aquí; en las demás se rellena aparte) | rfealive.es directo; resto vía `parse_event` |
| `viento` | Viento de la prueba | las 4 (cuando aplica) |

Diferencia clave de arquitectura:

- **conersys / FAM / rfealive.me**: `parse_schedule`/`parse_index` te da la **lista
  de pruebas**, y luego hay que pedir **una página por prueba** (`parse_event(url)`)
  para el detalle/podio. Es decir: 1 request para el horario + N requests para el
  detalle.
- **rfealive.es**: una **sola descarga** (`SCH<codigo>` de S3) ya trae el horario
  **con los resultados incluidos**. No hay request por prueba.

---

## 4. Cómo se usa cada scraper

### 4.1 conersyslive.es — `engine.py`

```python
import engine
comp, eventos = engine.parse_schedule("https://conersyslive.es/Results/Schedule?chid=2026AND65850")
# comp    -> "Campeonato ..." (título)
# eventos -> [{nombre, ronda, hora, fecha, estado, key, url}, ...]

# Detalle/podio de una prueba (request adicional):
podio, viento = engine.parse_event(eventos[0]["url"])
```

- Parser de horario: busca `a[href*="ResultsEvent"]` y saca `key`, hora, fecha,
  ronda, estado de la fila `<tr>`.
- Limitación: el campo que parece "club" es la **nacionalidad** (`Spain`/`Germany`),
  no el club real; no trae fecha de nacimiento ni categoría.

### 4.2 atletismomadrid.com (FAM) — `scraper_fam.py`

```python
import requests, scraper_fam
r = requests.get(index_url, headers=scraper_fam.HEADERS, timeout=30); r.encoding = "utf-8"
eventos = scraper_fam.parse_index(r.text)
# eventos -> [{hora, fecha, prueba, estado, archivo}, ...]
#   'archivo' es un enlace RELATIVO al index → urljoin(index_url, archivo)
#   'estado' = "Finalizado" / "Lista de Salida"

# Detalle de una prueba:
from urllib.parse import urljoin
rr = requests.get(urljoin(index_url, eventos[0]["archivo"]), headers=scraper_fam.HEADERS, timeout=30)
rr.encoding = "utf-8"
ev = scraper_fam.parse_event(rr.text)   # {prueba, podio[], resultados[]}
```

- **La más rica**: cada atleta trae licencia + fecha de nacimiento + categoría +
  club real.
- `parse_index` es el patrón que más se parece a lo que tú quieres: lista de
  pruebas con estado y enlace al fichero de cada una.

### 4.3 rfealive.me — `scraper_rfea.py`

```python
import scraper_rfea
comp, eventos = scraper_rfea.parse_schedule("https://rfealive.me/Results/Schedule?chid=2026EXT69178")
podio, viento, estado = scraper_rfea.parse_event(eventos[0]["url"])
```

- Mismo patrón de enlaces que conersys (`ResultsEvent`), pero plantilla HTML
  distinta (clases `rfep-…`). Trae **club real**, categoría y fecha de nacimiento.
- El `estado` (Oficial/Provisional) **no** está en el horario, solo en la página de
  resultado de cada prueba.
- Depende de `engine.nombre_corto()` y de `cruce.separar_marca_viento()`.

### 4.4 rfealive.es (Blazor) — `scraper_rfea_es.py`  ← el truco más valioso

Esta web es una app Blazor WebAssembly: **no sirve HTML de resultados**. Los datos
se descargan como **JSON comprimido en gzip directamente de un bucket S3**, sin
cabeceras especiales:

```
URL que pega el usuario:   https://rfealive.es/sch/2026CAT65561
Datos generales (título):  https://conersys-live-d.s3.dualstack.eu-west-3.amazonaws.com/CH2026CAT65561
Horario + resultados:      https://conersys-live-d.s3.dualstack.eu-west-3.amazonaws.com/SCH2026CAT65561
```

```python
import scraper_rfea_es
comp, eventos = scraper_rfea_es.parse_schedule("https://rfealive.es/sch/2026CAT65561")
# eventos ya trae 'podio' incluido en cada prueba (una sola descarga)
```

Puntos a recordar si lo adaptas:
- El cuerpo es gzip "de verdad" (`Content-Type: application/gzip`), **no**
  `Content-Encoding`, así que `requests` no lo descomprime solo →
  `gzip.decompress(r.content)` a mano.
- El código de competición es el último segmento de `/sch/<CODIGO>`.
- Cada item del JSON es **una ronda/fase** de una prueba, con su lista `Results`.
- Limitación de origen: solo da la **inicial** del nombre de pila y **no** trae
  fecha de nacimiento ni categoría.

---

## 5. Dependencia mínima: `cruce.py`

Los scrapers importan `cruce.py`, pero **solo usan utilidades de parsing de marca**
(nada de la lógica pesada de cruce contra base de datos). Si quieres llevarte lo
mínimo, estas son las únicas funciones de `cruce.py` que necesitan los scrapers:

| Función | Para qué | Quién la usa |
|---|---|---|
| `separar_marca_viento(texto)` | Separa `"7.20 0.0"` → `("7.20", "0.0")` sin romper tiempos `15:51.88` | los 4 scrapers |
| `normaliza(s)` | minúsculas, sin acentos ni signos (comparar nombres/pruebas) | scraper_fam |
| `valor_marca(m)` | Marca → número comparable (tiempo→s, concurso→m) | scraper_fam |
| `es_concurso(prueba)` | `True` si en esa prueba más es mejor (saltos/lanzam.) | scraper_fam |
| `mejor(a, b, concurso)` | Compara dos marcas según el tipo de prueba | scraper_fam |

Puedes dejar `cruce.py` entero (es autocontenido, solo `re` + `unicodedata`) o
copiar esas 5 funciones a un `marca_utils.py` tuyo. **No necesitas** `cruce_local.py`,
`records_espana.py`, `puntos_iaaf.py` ni los JSON de datos para la parte de scraping.

---

## 6. Qué te da esto y qué NO (importante para tu caso)

Tu scraper quiere, por competición: **pruebas que se disputan + enlaces a PDFs de
inscritos / resultados / info**. Encaje real:

**Te lo resuelve directamente:**
- ✅ Detección de la plataforma por URL (sección 2).
- ✅ Enumerar **las pruebas de una competición** en las 4 plataformas
  (`parse_schedule` / `parse_index`). Eso es tu "pruebas que se disputan".
- ✅ El **truco de rfealive.es** (Blazor → JSON gzip de S3): no es nada evidente y
  te ahorra horas si te topas con esa fuente.
- ✅ Normalización robusta de marca/viento/nombres (sección 5), reutilizable aunque
  cambies de objetivo.

**NO te lo da (tendrás que añadirlo tú):**
- ❌ **Enlaces a PDFs** (inscritos, resultados, dossier/info). La herramienta de
  podios solo lee resultados en pantalla; no busca PDFs. Para eso, en tu scraper:
  - En **FAM**, el listado de pruebas (`parse_index`) ya te da enlaces relativos por
    prueba; los PDFs de inscritos/resultados suelen colgar de la misma carpeta del
    evento (`/resultadosDirecto/<id>/…`). Reaprovecha el `urljoin(index_url, …)` y
    busca `a[href$=".pdf"]` en el índice y en cada página de prueba.
  - En **RFEA/Conersys**, los PDFs no están en estos endpoints de resultados; viven
    en el portal de la federación correspondiente (calendario/circulares). Esa parte
    es **nueva** y propia de tu scraper.
- ❌ **Listado de competiciones de todas las federaciones**. Estos scrapers parten de
  la URL de **una** competición ya conocida. El descubrimiento del calendario de cada
  federación es tuyo (es justo el valor diferencial de tu herramienta).
- ❌ **worldathletics.org**: era una fuente pendiente, no implementada (ver
  `NOTAS_PROYECTO.md`).

> Resumen del encaje: te llevas el **"cómo leer cada plataforma una vez tienes la URL
> de la competición"** (las 4 fuentes + utilidades). El **"descubrir qué
> competiciones hay"** y el **"sacar los PDFs"** son la capa que pone tu scraper
> encima.

---

## 7. Patrón de integración recomendado

1. Tu scraper descubre las competiciones por federación (tu lógica) → obtiene la
   **URL del horario** de cada una.
2. Para cada URL, llamas a `detectar_fuente(url)` (sección 2) y despachas al
   `parse_schedule`/`parse_index` correspondiente → **lista de pruebas**.
3. Adjuntas a tu registro de competición esa lista de pruebas (nombre, ronda, fecha,
   estado, url de la prueba).
4. **Capa nueva tuya**: sobre la misma página/carpeta de la competición, buscas los
   `*.pdf` (inscritos/resultados/info) y los adjuntas al registro.
5. Mantienes `cruce.separar_marca_viento` & co. a mano por si en algún momento
   quieres también normalizar marcas.

Hay un esqueleto funcional de los pasos 1-2 en `ejemplo_dispatcher.py`.

---

## 8. Instalación / requisitos

```bash
pip install -r scrapers_originales/requirements.txt
# en la práctica, para SOLO scraping basta:
pip install requests beautifulsoup4
```

`scraper_rfea_es.py` además usa `gzip` y `json` (librería estándar, nada que
instalar).

---

## 9. Avisos heredados (verificar antes de fiarte a ciegas)

De `PROYECTO.md` / `NOTAS_PROYECTO.md`, vigentes:
- **rfealive.me**: el parser de **concursos** (saltos/lanzamientos) no se ha probado
  contra un caso real, solo carreras. Revisa la forma de fila (puede tener columnas
  de intentos 1-6 en vez de un único `RESULTADO`).
- **rfealive.es**: solo da inicial del nombre; ninguna prueba "no oficial" se ha
  visto aún en ese formato (todas las observadas eran `Oficial`).
- **conersys**: "club" = nacionalidad, no club real.
- Estos scrapers asumen estructuras HTML concretas; si la federación cambia la
  plantilla, el parser se rompe. Programa con tolerancia a fallos por fuente (un
  `try/except` por competición, como hace `scrape_all`).
