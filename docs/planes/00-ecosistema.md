# Ecosistema lanedata — visión, repos y arquitectura de datos

> Documento maestro. Define cómo encajan los tres proyectos, qué se reutiliza de lo
> ya construido y por qué. Léelo antes que cualquier plan concreto (`01`, `02`, `03`).

## 1. Las tres capas

```
                 ┌────────────────────────────────────────────┐
                 │  fantasy-atletismo-engine  (repo privado)   │
                 │  ── MOTOR DE DATOS, fuente canónica ──       │
                 │  Scraping (RFEA + federaciones) +            │
                 │  inscritos + resultados (live + PDF/LLM) +   │
                 │  reconciliación + ingesta idempotente        │
                 │  Salida: Supabase (engine) + JSON exportado  │
                 └───────────────┬───────────────┬─────────────┘
                                 │               │
              lee datos (build)  │               │  lee datos (runtime/build)
                                 ▼               ▼
            ┌──────────────────────────┐   ┌──────────────────────────┐
            │  lanedataweb (repo web)  │   │  fantasy-game (repo nuevo)│
            │  Web editorial + calen-  │   │  Fantasy: ligas, plantil- │
            │  dario público.          │   │  las, puntuación, usuarios│
            │  Consume datos del motor │   │  Consume datos del motor  │
            └──────────────────────────┘   └──────────────────────────┘
```

- **Motor (`fantasy-atletismo-engine`)**: el único sitio donde se scrapea. Descubre
  competiciones, baja inscritos y resultados, los parsea y los deja en una BBDD
  normalizada. Es la **fuente de verdad** de atletas, competiciones, pruebas, inscripciones
  y resultados. Plan: `01-engine.md`.
- **Web (`lanedataweb`)**: la web editorial actual. Su calendario **deja de scrapear por su
  cuenta** y pasa a consumir lo que produce el motor. Plan: `02-lanedataweb.md`.
- **Juego (`fantasy-game`)**: el fantasy en sí (ligas, selección de atletas, puntuación, usuarios).
  No scrapea nada: lee del motor. Plan: `03-fantasy-game.md`.

## 2. Decisión clave: el scraping se consolida en el motor

Hoy el scraping vive en `lanedataweb/calendar_scraper/` (RFEA + Galicia + La Rioja +
Andalucía) y produce un JSON estático para el calendario de la web. Ese código **es valioso
y se reutiliza**, pero su hogar natural pasa a ser el motor, porque:

1. El motor necesita un scraping *más profundo* que la web (no solo "qué se corre", sino
   inscritos con identidad y resultados desde PDF). Es un superconjunto.
2. Tener dos scrapers de la RFEA (uno en la web, otro en el motor) es duplicación que
   divergirá. Una sola implementación.
3. La web, al volverse consumidora, se simplifica (menos build, menos dependencias Python).

**Qué se reutiliza concretamente** (de `calendar_scraper/`, ver inventario en `01-engine.md §1`):

| Pieza actual | Destino en el motor |
|---|---|
| `http.py` (throttle 1 req/s, UA, charset) | `engine/http.py` casi tal cual |
| `rfea.py` (calendario AJAX + detalle + pruebas + inscritos) | núcleo del adapter RFEA |
| `fuentes/galicia.py`, `fuentes/larioja.py` | adapters regionales |
| `fuentes_spa/andalucia.py` (Playwright) | adapter SPA |
| `models.py` (pydantic) | base de los modelos del motor |
| `geo.py` (ciudad→CCAA), `merge.py` (dedup) | utilidades reutilizables |

> **No se reutiliza** nada de PDF→LLM, resultados, reconciliación por identidad ni ingesta
> en Postgres: eso no existe hoy y es el grueso del trabajo nuevo del motor.

**Alternativa descartada** (librería compartida vía pip/submódulo entre web y motor): añade
overhead de versionado para un beneficio que desaparece en cuanto la web deja de scrapear.
Si por algún motivo la web tuviera que seguir scrapeando de forma independiente durante una
transición larga, se puede extraer `calendar_scraper` a un paquete `git+https://…` y que ambos
lo instalen; pero el objetivo es consolidar en el motor.

## 3. Identificador maestro de atleta (decisión cerrada)

La licencia federativa **no siempre se expone** en inscritos/resultados. Por tanto:

- **Clave natural maestra = `(nombre_completo_normalizado, fecha_nacimiento)`.**
- **Licencia = señal fuerte opcional**: cuando aparece y valida contra el patrón de la
  federación, identifica/funde al atleta aunque el nombre varíe de grafía. Se guarda en una
  columna *nullable*.
- **Degradación** cuando la fuente no da fecha de nacimiento completa:
  1. Solo **año** de nacimiento → matching por `(nombre_normalizado, año)`.
  2. Ni año ni fecha → matching **difuso por nombre restringido a los inscritos de esa misma
     prueba/competición** (rapidfuzz ≥ 0.92); si es único, match con confianza reducida; si
     hay 0 o >1 candidatos → cola de revisión, nunca inserción silenciosa.

Detalle de esquema y algoritmo en `01-engine.md` (M2 y M6).

## 4. Arquitectura de datos / BBDD

- **Dos proyectos Supabase separados** (ambos free tier):
  - `engine` → BBDD del motor (atletas, competiciones, pruebas, inscripciones, resultados,
    runs, documentos, revisión). Fuente canónica.
  - `lanedata` (el actual) → auth + artículos editoriales. **No se mezcla** con el motor.
- **El `fantasy-game` lee del proyecto `engine`** (read-only sobre las tablas de datos; sus propias
  tablas de juego —ligas, usuarios, plantillas, puntos— viven en su proyecto Supabase, que
  puede ser el mismo del motor en un esquema `game` separado, o uno propio; decisión diferida
  a `03-fantasy-game.md`).
- **La web `lanedata`** consume los datos del motor en *build time*. Dos vías posibles
  (elige el motor cuál exporta, ver `01-engine.md` M7):
  - **JSON exportado** por el motor a un endpoint/artefacto estático (más simple para una web
    estática en GitHub Pages). **Recomendada para empezar.**
  - Lectura directa del Supabase `engine` con service key en build.

Por qué separados y no un solo Supabase: aislamiento de *blast radius* y de secretos (el motor
maneja service keys, Gemini, borrado de Storage; la web despliega a Pages). Es más fácil unir
después que separar. Free tier permite varios proyectos sin coste.

## 5. Orden de ejecución entre repos

```
1. fantasy-atletismo-engine: M0 → M5  (hito go/no-go en M5)
                              │
2. fantasy-atletismo-engine: M6 → M8  (datos canónicos ya fluyendo a Supabase)
                              │
3. lanedataweb: integración  (consumir datos del motor; retirar calendar_scraper)
                              │
4. fantasy-game: arranque    (cuando el motor sirve datos estables de resultados)
```

- La web (`02`) **no se toca** hasta que el motor produzca datos fiables (al menos inscritos +
  competiciones; idealmente resultados). Mientras tanto, su `calendar_scraper` actual sigue
  funcionando como está: no se rompe nada.
- El juego (`fantasy-game`) es lo último: depende de que el motor sirva *resultados* con calidad, que
  es justo el hito de riesgo (M5).

## 6. Estado actual y notas de ejecución

- El repo `fantasy-atletismo-engine` ya tiene vinculadas las APIs de Claude, GitHub y Supabase
  (lo indicó el responsable): una sesión de Claude puede ejecutar `01-engine.md` directamente
  en ese repo.
- Estos planes se han redactado desde `lanedataweb` (único repo con acceso de escritura en la
  sesión que los generó). **Acción pendiente**: mover `01-engine.md` y `03-fantasy-game.md` a sus
  repos respectivos (o ejecutarlos desde una sesión abierta en cada repo). `02-lanedataweb.md`
  ya está en su sitio.
- Ningún plan asume coste > 0 €: GitHub Actions + Supabase Free + Gemini Free + Resend Free.
