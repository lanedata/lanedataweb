# Podios → Stories / Twitter — Documentación del proyecto

> Este documento describe el **estado actual** de todo el proyecto: qué hace, cómo está construido, cada módulo, cómo se usa y sus limitaciones conocidas. Es la referencia técnica para alguien que se incorpora.
>
> Para el **historial** de decisiones, bugs encontrados y cómo se arreglaron (con fechas), ver [`NOTAS_PROYECTO.md`](./NOTAS_PROYECTO.md). Para el detalle específico de la imagen para Twitter/X, ver [`IMAGEN_TWITTER.md`](./IMAGEN_TWITTER.md) (su contenido ya está integrado aquí, pero queda como referencia aparte).

## 1. Qué es esto

Una **herramienta interna** (no un producto independiente) que automatiza la creación de contenido para redes sociales a partir de resultados de competiciones de atletismo: pegas la URL de una competición, eliges una prueba ya finalizada, y generas en segundos un **vídeo vertical 9:16** (Instagram/TikTok Stories) o una **imagen horizontal 16:9** (X/Twitter) con el podio (top 3), club, marca, viento y "etiquetas" automáticas (marca personal, récord, mínima, líder nacional…) calculadas cruzando el resultado contra una base de datos histórica de atletismo español.

**Contexto importante**: este proyecto es **una sola funcionalidad** dentro de una web/plataforma de gestión de atletismo más grande (repo hermano `C:\Proyectos\manager-atletismo`, rama `main-adm`, mismo proyecto Firestore `manager-atletismo`/marca "lanedata"). Hoy vive como una app Flask local independiente porque se está validando la lógica antes de integrarla en esa plataforma — ver la sección 8 (Decisiones pendientes / integración futura).

## 2. Arquitectura: 4 piezas que se combinan

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│  SCRAPERS   │ -> │    CRUCE     │ -> │      WEB        │ -> │   RENDER     │
│ (4 formatos)│    │ (vs BD local)│    │ (app.py, Flask)  │    │ (vídeo/img)  │
└─────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
```

1. **Scrapers**: dado la URL de una competición, descargan el horario y el podio (top 3) de cada prueba. Hay 4 implementaciones porque hay 4 webs/formatos distintos de origen de datos (sección 3).
2. **Cruce**: cada atleta del podio se busca en una base de datos local (exportada de Firestore) para saber si esa marca es relevante (marca personal, récord de España, mínima, nº1 nacional…) (sección 4).
3. **Web (`app.py`)**: interfaz Flask local de un solo archivo (HTML+CSS+JS embebidos) que ata todo: pegas la URL, ves las pruebas con su podio y sus "destacados", y generas el vídeo/imagen (sección 5).
4. **Render (`render_podio.py`)**: dibuja el vídeo MP4 o la imagen PNG final con el diseño "estilo lanedata" (sección 6).

## 3. Los 4 scrapers (orígenes de datos soportados)

La web detecta automáticamente la fuente por la URL pegada. Cada origen tiene su propio módulo porque cada web tiene una estructura distinta (aunque 3 de las 4 comparten el mismo backend "Conersys Sports Solutions" por detrás).

| Fuente | Módulo | Tecnología de scraping | Datos extra que trae | Limitación conocida |
|---|---|---|---|---|
| **conersyslive.es** | `engine.py` | HTML estático (BeautifulSoup) | Nacionalidad (mal etiquetada como "club") | No trae fecha de nacimiento ni categoría |
| **atletismomadrid.com / FAM** | `scraper_fam.py` | HTML estático | Licencia, fecha nacimiento, categoría, club real | Podio = 3 mejores marcas de las finales, no por puesto de serie |
| **rfealive.me** | `scraper_rfea.py` | HTML estático, plantilla distinta a conersys | Club real, categoría, fecha nacimiento | No probado aún contra una prueba de concurso real (solo carreras) |
| **rfealive.es** (Blazor WASM) | `scraper_rfea_es.py` | JSON+gzip descargado directo de S3 (sin HTML) | El podio de TODAS las pruebas viene en una sola descarga | **Solo da la INICIAL del nombre de pila** del atleta (no el nombre completo) ni fecha de nacimiento/categoría — limitación del dato de origen, no del scraper |

`scraper_conersys.py` es una **versión antigua/no usada** de `engine.py` (superada, `app.py` no la importa) — se conserva en la carpeta pero no es parte del flujo activo.

Las 4 implementaciones comparten utilidades de `cruce.py` (`separar_marca_viento()`, para separar marca y viento cuando vienen pegados en la misma celda, ej. en saltos).

Cada scraper, para cada atleta del podio, distingue dos campos:
- `nombre`: versión corta para **mostrar** (nombre + 1er apellido).
- `atleta`: nombre **completo sin recortar**, usado para **cruzar** con la BD (que guarda todos los apellidos). Si solo se guardara la versión corta, el cruce nunca encontraría al atleta (bug real ya corregido, ver `NOTAS_PROYECTO.md` 2026-06-22).

## 4. El cruce: cómo se decide si una marca es "destacada"

### 4.1 Lógica pura vs. capa de datos

- **`cruce.py`** — "cerebro": lógica pura sin red ni ficheros. Dado un resultado (`atleta, prueba, marca, viento, país, fechaNac`) y un contexto ya preparado (histórico del atleta, mínimas aplicables, récord, ranking), decide qué `flags` aplican: `MMP` (marca personal), `MEJOR_TEMPORADA` (SB), `IGUALA_MMP`/`IGUALA_SB` (empate sin superar), `MINIMA`/`MINIMA_REPESCA`, `RECORD_ESPANA`, `N1_ABSOLUTO`, `N1_CATEGORIA`.
- **`cruce_local.py`** — capa de datos: lee los exports JSON locales (sección 4.2), construye índices y llama a `cruce.analizar_resultado()` por cada resultado. Es la versión "local" porque no necesita Firestore en vivo; existe también un borrador (`cruce_competicion.ts`) pensado para que el equipo lo reutilice en TypeScript con su lógica ya existente (ver sección 8).

### 4.2 Datos de referencia (exports locales)

`exportar_bd.py` exporta (solo lectura) desde Firestore del proyecto `manager-atletismo`, usando una clave de servicio (`clave.json`), a estos ficheros JSON en la misma carpeta:

- `marcas_club.json` — todas las marcas del club.
- `ranking_nacional_<año>.json` (2020-2026, ~4,3M filas combinando varias colecciones) — ranking nacional completo, para poder calcular nº1 y comparar contra cualquier atleta español, no solo del club.
- `minimas_nacional.json` / `minimas_internacional.json` — mínimas de clasificación.
- `recordsEspana.json` — récords de España (leído por `records_espana.py`).
- `iaaf_scoring.json` (NO generado todavía, pendiente — ver sección 7) — tabla de puntos IAAF, leída por `puntos_iaaf.py`.

Por el volumen del ranking nacional, `cruce_local.construir_indices()` cachea el resultado en **`indice_nacional.pkl`** (tarda ~90s la primera vez; instantáneo después). La caché se invalida automáticamente si algún JSON fuente es más reciente que el `.pkl`, o si le falta alguna clave esperada (mecanismo usado varias veces al añadir nuevos índices).

Los índices que construye `construir_indices()`:

| Índice | Para qué |
|---|---|
| `pb` / `sb` | Mejor marca de toda la vida / del año en curso, por atleta+prueba |
| `ranking_abs` / `ranking_cat` | Mejor marca nacional del año, global y por categoría de edad |
| `club_idx` | Club real más reciente conocido de cada atleta (para mostrar club real en vez de la nacionalidad que da Conersys) |
| `marcas_fecha` | Todas las marcas de un atleta+prueba **con fecha**, para poder calcular su PB/SB de **antes** de la competición analizada (no "el mejor de toda la vida a día de hoy", que ya incluiría la propia marca si la competición ya está en el export — bug real corregido, caso Pablo Rojo Castaño) |
| `nombre_idx` | Nombre completo tal cual está en la BD, para mostrar siempre "Nombre Apellido1" canónico aunque el scraper de origen solo dé una abreviatura |
| `ini_idx` | Fallback para fuentes que solo dan la inicial del nombre de pila (rfealive.es): mapea "inicial + apellidos" → candidatos con nombre completo. Solo resuelve si hay **exactamente un candidato** (si hay 0 o varios, no se adivina — mejor 0 destacados que atribuir mal una marca) |

### 4.3 Reglas de negocio acordadas (resumen — detalle e historial en `NOTAS_PROYECTO.md`)

- **Viento favorable > +2.0 m/s** anula la marca a efectos de MMP/SB/mínimas/récord/Nº1 (el viento en contra nunca anula).
- **Atletas extranjeros** nunca pueden ser líder español, récord de España, ni cumplir mínima internacional (MMP/SB sí se mantienen, son logros personales).
- **Igualar (sin superar)** el propio PB/SB se destaca en la tabla de cada prueba, pero no cuenta para la caja "Destacados" global ni desbloquea mínima/récord/Nº1.
- La **caja "Destacados" global** solo cuenta récord, mínima internacional o líder nacional — ni "marca personal" ni "mejor del año" en solitario son noticia suficiente para esa caja (sí aparecen en la tabla por prueba).
- Jerarquía de **etiquetas en el vídeo/imagen**: récord de España implica PB y SB (no se muestran aparte); si no hay récord, PB implica SB. Mínima(s) internacionales y líder nacional son de otro eje y se muestran siempre que apliquen, sin límite.

## 5. La web (`app.py`)

Servidor Flask de un único archivo (HTML/CSS/JS embebidos en la constante `PAGINA`). Arranque:

```
pip install flask requests beautifulsoup4 pillow numpy imageio imageio-ffmpeg
python app.py
# -> http://localhost:5000  (o http://LA-IP-DE-TU-PC:5000 desde el móvil, misma wifi)
```

**Flujo de uso**: pegar URL → la web detecta la fuente (`/api/events`, mira si la URL contiene `conersyslive.es`, `atletismomadrid.com`, `rfealive.me` o `rfealive.es`) → lista las pruebas, agrupadas en **Oficiales** / **Pendientes**, con buscador por nombre → cada prueba con podio oficial permite: subir y encuadrar foto (recorte independiente para vídeo 9:16 e imagen Twitter ~1:1) → generar vídeo (`/api/video`) y/o imagen para Twitter (`/api/imagen_twitter`).

Rutas:
- `GET /` — la página.
- `GET /api/events?url=...` — scrapea + cruza, devuelve `{competicion, eventos, resumen, fuente}`.
- `GET /debug?url=...` — diagnóstico (solo conersys): vuelca el HTML limpio de la primera prueba, para depurar parsers nuevos.
- `POST /api/video` — genera el MP4 (form: competición, fecha, categoría, podio JSON, foto opcional).
- `POST /api/imagen_twitter` — igual pero genera PNG horizontal.

Detalles de UI ya implementados: loader animado (corredor pixel-art saltando vallas, CSS puro), checkbox "club real" (busca en la BD en vez de mostrar la nacionalidad de Conersys), indicador "✓ vídeo"/"✓ imagen" ya generados por prueba (solo en memoria del navegador, se pierde al recargar), mensaje explícito cuando no hay nada destacado.

## 6. El render (`render_podio.py`)

Dos salidas, mismo motor de dibujo (Pillow + numpy, estética "lanedata": verde oscuro `#091810`, acento lima):

- **`render(out, competicion, fecha, categoria, podio, foto=None, dur=8.0)`** → vídeo MP4 vertical **1080×1920 (9:16)**, 8 segundos animados (imageio + ffmpeg). Con foto: texto en el ~37% inferior. Sin foto: diseño alternativo centrado.
- **`render_imagen(out, competicion, fecha, categoria, podio, foto=None)`** → imagen PNG horizontal **1200×675 (16:9)**, tamaño recomendado por X para tarjetas `summary_large_image`. Con foto: ocupa el 60% del ancho, podio apilado verticalmente en el 40% restante. Sin foto: las 3 columnas lado a lado.

Cada atleta del podio recibe una lista de `etiquetas` (calculada en `app.py` vía `cruce.etiquetas_video()`) que se pintan como píldoras debajo del club. El layout de filas/píldoras es **dinámico**: si un atleta tiene muchas etiquetas, las filas siguientes se desplazan hacia abajo automáticamente, y si pese a todo no cupiera, primero se reduce el tamaño de letra y, como último recurso, se deja de pintar la etiqueta sobrante — nunca se permite que el texto se solape entre filas o con el pie de página.

Las tipografías (Poppins + DejaVu Sans Mono) están empaquetadas en `./fonts` para que el resultado se vea igual en cualquier ordenador.

## 7. Datos auxiliares y su estado

| Dato | Fichero | Estado |
|---|---|---|
| Mínimas nacional/internacional | `minimas_nacional.json`, `minimas_internacional.json` | ✅ exportado y en uso |
| Récords de España | `recordsEspana.json` | ✅ exportado y en uso (reutilizado de `src/data/recordsEspana.json` del repo del equipo) |
| Ranking nacional histórico | `ranking_nacional_2020..2026.json` | ✅ exportado y en uso (~4,3M filas) |
| Marcas del club | `marcas_club.json` | ✅ exportado y en uso |
| **Puntos IAAF** | `iaaf_scoring.json` | ❌ **pendiente de generar** — `puntos_iaaf.py` está listo (`clave_iaaf()`, `puntos()`) pero hace falta correr `scripts/extract_iaaf_scoring.py` del repo del equipo sobre el PDF oficial WA 2025 (requiere `pdftotext`/poppler). Verificación de referencia ya documentada: 400mv H 48.11 ≈ 1226 puntos |

## 8. Decisión de arquitectura pendiente (no bloquea el trabajo actual)

Hallazgo clave (repo `C:\Proyectos\manager-atletismo`, rama `main-adm`, carpeta `src/lib`): el equipo **ya tiene** una lógica de cruce madura en TypeScript (`categorias.ts`, `marks.ts`, `minimas.ts`) más completa que la de este proyecto en varios matices (material por categoría, dedupe de marcas, etc.). La recomendación documentada es **no reinventar en Python** para evitar que los números diverjan de los de su web — `cruce_competicion.ts` es un borrador para integrar el cruce en Node reutilizando esos módulos, dejando el vídeo en Python (o portándolo también, ya existe `@napi-rs/canvas` en su stack).

Esto es una decisión a alinear con el equipo (Santi), no bloquea seguir trabajando aquí: `cruce.py`/`cruce_local.py`/`records_espana.py`/`puntos_iaaf.py` ya validaron que la lógica funciona, pero no se consideran la vía final de producción.

## 9. Limitaciones conocidas (vigentes a fecha de este documento)

- **rfealive.es**: solo da la inicial del nombre de pila (se resuelve contra la BD por "inicial+apellidos" cuando hay un único candidato; ver `ini_idx`) y no trae fecha de nacimiento ni categoría (igual que conersyslive.es).
- **conersyslive.es**: el campo que parece "club" es en realidad la nacionalidad ("Spain"/"Germany"); el club real se busca en la BD local cuando el atleta ya tiene historial.
- **Nº1 de ranking**: puede dar un falso negativo si la propia marca que se analiza ya es la que lidera el ranking del año (mismo patrón de "comparar contra sí mismo" que ya se corrigió para PB/SB, pero aquí no — menor severidad, no atribuye nada falso, solo puede no avisar de un hito real).
- **rfealive.me**: el parser de concursos (saltos/lanzamientos) no se ha probado todavía contra un caso real, solo contra carreras.
- **Material por categoría en mínimas** (ej. Sub18 compitiendo con material de Sub20): simplificado en `cruce_local.elegible()`, sin validar contra la regla fina del equipo.
- **Indicadores "✓ generado"** en la web viven solo en memoria del navegador (se pierden al recargar).

## 10. Mapa de ficheros

```
app.py                  Web Flask (interfaz + rutas /api/*)
engine.py                Scraper conersyslive.es + utilidades nombre_corto()
scraper_fam.py            Scraper atletismomadrid.com (FAM)
scraper_rfea.py            Scraper rfealive.me
scraper_rfea_es.py          Scraper rfealive.es (Blazor + S3 JSON gzip)
scraper_conersys.py          (versión antigua de engine.py, no usada)
cruce.py                 Lógica pura del cruce (flags, etiquetas, utilidades de marca/viento)
cruce_local.py             Capa de datos del cruce (índices, caché, análisis de competición)
cruce_competicion.ts        Borrador TS para integrar el cruce en el repo del equipo
records_espana.py          Lector de récords de España
puntos_iaaf.py             Calculadora de puntos IAAF (pendiente de iaaf_scoring.json)
exportar_bd.py             Exporta datos de Firestore a los JSON locales
render_podio.py            Render del vídeo MP4 y de la imagen PNG
extract_iaaf_scoring.py      Extrae la tabla IAAF de un PDF (script del repo del equipo)
debug_chunks.py / inspeccionar_bd.py   Utilidades puntuales de inspección de la BD exportada
fonts/                  Tipografías empaquetadas (Poppins, DejaVu Sans Mono)
*.json                  Exports de datos (marcas, mínimas, ranking, récords) — ver sección 7
indice_nacional.pkl        Caché de índices (se regenera sola si los JSON cambian)
NOTAS_PROYECTO.md          Historial de decisiones y bugs (con fechas)
IMAGEN_TWITTER.md          Detalle específico de la funcionalidad de imagen para Twitter
```
