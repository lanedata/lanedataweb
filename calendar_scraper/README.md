# calendar_scraper

Extractor de **competiciones de atletismo** a partir del calendario de la RFEA
(`atletismorfea.es`), que agrega además los **campeonatos autonómicos**. Carpeta
autocontenida y portable: produce **JSON** listo para consumir desde una web.

Por cada competición devuelve:

| Campo | Descripción |
|---|---|
| `id` | Identificador (Salesforce Id de RFEA) |
| `nombre` | Nombre de la competición |
| `ambito` | `RFEA` o federación autonómica |
| `disciplina` | `Pista Aire libre`, `Ruta`, `Trail`… |
| `fecha_inicio` / `fecha_fin` | Fechas (ISO `YYYY-MM-DD`) |
| `lugar` | Sede |
| `pruebas[]` | Lista de pruebas: `{id, nombre, n_inscritos}` |
| `horario[]` | Horas por prueba si están publicadas (`{hora, prueba, ronda}`) |
| `inscripcion` | `{abierta, fecha_limite, url, instrucciones}` |
| `url_detalle` | Página de la competición |
| `url_inscritos` | Listado de inscritos (start list) |
| `url_resultados` | PDF de resultados oficiales (cuando existe) |
| `url_directo` | Resultados en directo / streaming |
| `documentos[]` | Normas, sorteos, estadillos… `{nombre, url}` |

## Uso

### Como librería

```python
from calendar_scraper import listar_competiciones

comps = listar_competiciones("2026-06-19", "2026-06-22")   # acepta str o datetime.date
for c in comps:
    print(c.nombre, c.fecha_inicio, c.lugar, len(c.pruebas), "pruebas")

# Serializar a JSON (web):
import json
data = [c.model_dump(mode="json") for c in comps]
json.dump(data, open("comps.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
```

### Como CLI

```bash
# Vuelca a JSON un rango de fechas
python -m calendar_scraper --desde 2026-06-19 --hasta 2026-06-22 --out comps.json

# Solo listado básico (rápido, sin abrir cada detalle)
python -m calendar_scraper --desde 2026-06-19 --hasta 2026-06-22 --sin-enriquecer

# Limitar nº de competiciones enriquecidas (pruebas/depuración)
python -m calendar_scraper --desde 2026-06-01 --hasta 2026-06-30 --limite 10 --out comps.json

# Incluir la START LIST (inscritos) de cada prueba (lento: 1 req/prueba)
python -m calendar_scraper --desde 2026-06-19 --hasta 2026-06-22 --con-inscritos --out comps.json
```

Con `--con-inscritos`, cada `prueba` incluye `n_inscritos` y `inscritos[]` con
`{nombre, apellidos, club, pais, categoria, marca_inscripcion, fecha_marca, lugar_marca}`.

Salida: array JSON UTF-8 (un objeto por competición). Ver `data/ejemplo.json`.

## Integración en una web

1. Ejecuta el scraper periódicamente (cron / GitHub Actions) y guarda el `comps.json`.
2. Sirve ese JSON estático desde tu CDN/backend; el front lo consume directamente.
   (Mismo patrón "precomputar offline → servir estático" que usan los sitios de ranking.)
3. Cada competición trae enlaces (`url_detalle`, `url_inscritos`, `inscripcion.url`,
   `url_resultados`) para enlazar desde la ficha.

## Instalación

```bash
pip install -r calendar_scraper/requirements.txt
```

## Fuentes (multi-federación)

El orquestador combina la **RFEA** (calendario nacional + campeonatos autonómicos) con
**fuentes federativas** adicionales en `fuentes/` y **deduplica** las que aparecen en
varias (misma fecha + núcleo de nombre normalizado → se fusionan conservando la más
completa). Ver `merge.py`.

**Tres vías:** las de HTML estático/API las hace el scraper principal (httpx, en el
deploy). Las **SPA** (Blazor/JS) las hace un workflow aparte con **Playwright**
(`scripts/scrape_spa.py` → `public/data/federaciones_spa.json`), que el scraper
principal fusiona. Y el **motor `fantasy-atletismo-engine`** (repo propio, clonado
en `fantasy-atletismo-engine/` en local y en CI con el secret `ENGINE_REPO_TOKEN`)
aporta el descubrimiento de **14 federaciones autonómicas** vía
`fuentes_engine.py` — si el motor no está clonado, se omite sin fallar.

| Fuente | Estado | Método |
|---|---|---|
| RFEA | ✅ http | API AJAX de calendario (mes por timestamp) + detalle |
| Galicia (`fuentes/galicia.py`) | ✅ http | HTML estático de `atletismo.gal/competicions/` |
| La Rioja (`fuentes/larioja.py`) | ✅ http | HTML estático de `fratletismo.com/competiciones` |
| **Madrid** (`fuentes/madrid.py`) | ✅ http | Calendario Joomla (`atletismomadrid.com`). Tras **Cloudflare** → se pasa con curl_cffi. Trae reglamento/inscritos/resultados PDF y plazo de inscripción |
| **Andalucía** (`fuentes_spa/andalucia.py`) | ✅ Playwright | `web.faalive.com/Calendar` es Blazor WASM: se renderiza, se iteran las pestañas de mes y se leen las `.card` del DOM |
| **Motor** (`fuentes_engine.py`) | ✅ adapters | Galicia, La Rioja, Andalucía, Aragón, Extremadura, Navarra, Cantabria, Cataluña, Castilla y León, Castilla-La Mancha, País Vasco, Baleares (http) + Valencia (Playwright headless, en `scrape_spa.py`) + Madrid (Playwright headed, solo local con `ENGINE_HEADED=1`) |
| Canarias | ⛔ calendario JS (FullCalendar) → pendiente |

Para añadir una federación SPA: crea `fuentes_spa/<fed>.py` con
`listar(page, desde, hasta) -> list[Competicion]` y regístrala en
`fuentes_spa/__init__.py::FUENTES_SPA`. Las federaciones nuevas del motor se
recogen solas: `fuentes_engine.listar` usa `engine.adapters.adapters()` (solo hay
que añadir su `ambito` a `fuentes_engine.AMBITOS` si el id es nuevo).

Para añadir una federación: crea `fuentes/<fed>.py` con `listar(http, desde, hasta) ->
list[Competicion]` y regístrala en `fuentes/__init__.py::FUENTES`. El merge y el frontend
la recogen automáticamente.

## Procesamiento (patrones adaptados del motor `fantasy-atletismo-engine`)

En agosto de 2026 se adaptaron al calendario los patrones de procesamiento del motor:

- **Política de errores** (`fuentes/__init__.py`): una fuente que falla **propaga** su
  error; nunca devuelve `[]` como si no hubiera competiciones. El orquestador aísla el
  fallo por fuente y lo registra. La regla existe porque `scrape_calendar.py` conserva
  el JSON anterior cuando una fuente cae: el calendario sigue pareciendo correcto y una
  captura degradada disfrazada de n=0 es invisible durante semanas (pasó con Madrid y
  con el propio calendario RFEA).
- **Resumen por fuente** (`resumen.py`): cada pasada deja
  `public/data/scrape_status.json` (y `spa_status.json` en el workflow SPA) con la
  aportación de cada fuente, y compara con la pasada anterior para avisar de
  **regresiones** (fuente que aportaba y ahora falla o da 0) con anotaciones
  `::warning::` visibles en GitHub Actions.
- **HTTP endurecido** (`http.py`): reintentos con backoff SOLO en red/5xx (nunca 4xx),
  throttle de 1 req/s por dominio **thread-safe** (modelo de reserva de turnos, seguro
  con el pool de hilos de `fuentes_engine`), detección de charset
  (cabecera → `<meta>` → fallback) y cabeceras por petición (`get_text(url, headers=…)`).
- **Fechas compartidas** (`fechas.py`): tabla única de meses (completos y abreviados)
  y `anyo_en_ventana()` para calendarios que publican día/mes sin año.
- **AJAX de Drupal** (`rfea.py::_ajax_json`): TODOS los endpoints AJAX de la RFEA se
  piden con `Accept: application/json` + `X-Requested-With` y se desenvuelven del
  `<textarea>` (patrón iframe-upload de Drupal 10, que su page cache puede servir a
  cualquier cliente). Antes solo lo hacía el endpoint de inscritos; el del calendario
  rompió en ago 2026 por esto mismo.

## Alcance y limitaciones (importante)

- **Fuente:** RFEA. Su calendario incluye los campeonatos nacionales y autonómicos, pero
  **no** todas las competiciones populares locales. Para cobertura total habría que añadir
  fuentes por federación (arquitectura preparada para ello: añadir un módulo análogo a
  `rfea.py` y combinarlo en `scraper.py`).
- **`inscripcion.fecha_limite`** y **`horario`**: RFEA **no** los publica de forma
  estructurada (suelen vivir dentro del PDF de *normas* o en la web de la federación
  organizadora). Se rellenan *best-effort* cuando aparecen en el detalle; en otro caso van
  a `null` / `[]`. Posible mejora: leer el plazo desde el PDF de normas y el horario desde
  el PDF de resultados/horario.
- **`inscripcion.url`**: usa el "Sitio oficial" del detalle si existe; si no, la página de
  detalle de RFEA. Las competiciones RFEA se inscriben por la federación (no online público).
- Codificación: la salida es **UTF-8 correcto** (acentos incluidos).
- Buen comportamiento: 1 req/seg por dominio, User-Agent identificable.
