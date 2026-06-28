# Plan de ingeniería: Motor de Datos del Fantasy de Atletismo (v2)
### Repo: `fantasy-atletismo-engine` · Coste de mantenimiento: 0 € · Python 3.11+

> **Versión 2.** Revisa el plan original incorporando tres decisiones cerradas:
> 1. **Identificador maestro = `(nombre_completo_normalizado, fecha_nacimiento)`**, no la
>    licencia (que no siempre se expone). Licencia = señal fuerte opcional. → reescribe M2 y M6.
> 2. **Reutilización del scraper existente** `calendar_scraper` (RFEA + federaciones) que ya
>    funciona en el repo `lanedataweb`. → afecta M1, M3, M4.
> 3. **PDFs heterogéneos**: no hay un formato único; el sistema recolecta un corpus diverso e
>    itera, enrutando lo no parseable a revisión en vez de adivinar. → afecta M1 y M5.
>
> **Cómo usar este documento:** hitos secuenciales M0 → M8. Cada uno: objetivo, instrucciones,
> criterios de aceptación verificables y trampas. No avanzar sin pasar los criterios del actual.
> Hito de no-retorno (go/no-go): **M5**.

---

## 0. Contexto y restricciones globales

### 0.1 Qué se construye
Un sistema 100% autónomo que cada fin de semana:
1. **Descubre** las competiciones de atletismo del finde en las webs federativas.
2. **Obtiene** inscritos (jue/vie) y resultados (domingo provisional vía live, lunes definitivo
   vía PDF) mediante cascada: API/JSON oculto → HTML estructurado → PDF + LLM.
3. **Parsea** a JSON validado (identidad, club, marca, puesto, DNS/DNF/DQ).
4. **Inyecta** en Supabase (PostgreSQL) de forma idempotente.
5. **Alerta** por email solo cuando todas las capas fallan.

Es la **fuente de datos canónica** del ecosistema (ver `00-ecosistema.md`). La web y el juego
leen de aquí; aquí no se construye nada de juego/ligas.

### 0.2 Restricciones duras (no negociables)
- **Coste 0 €/mes:** GitHub Actions (cron), Supabase Free (500 MB DB + 1 GB Storage), Gemini
  API Free Tier, Resend Free (100 emails/día).
- **Cero intervención del usuario final.** Nada de "pegar URLs cada jueves".
- **Idempotencia total:** cualquier job se ejecuta 2 veces sin duplicar (claves naturales + UPSERT).
- **Identificador maestro:** `(nombre_completo_normalizado, fecha_nacimiento)`. La licencia es
  una señal de apoyo, nunca la clave (ver §0.5 y M6).
- **Todo secreto en GitHub Secrets / env vars.** Jamás en el código.

### 0.3 Decisiones de arquitectura ya tomadas (no reabrir)
- Python 3.11+. `requirements.txt` pinneado (versiones exactas).
- Scraping: `httpx` + `selectolax` (HTML), `Playwright` (solo cuando JS sea imprescindible).
- PDF: `pdfplumber` con `layout=True`.
- LLM: `google-genai` contra Gemini Flash (free tier) con **structured output** (`response_schema`).
- DB: `psycopg` directo al pooler de Supabase para inserciones; SDK solo para Storage.
- Validación: `pydantic v2` en TODOS los bordes.
- **Reutilización:** se porta el código de scraping ya probado de `calendar_scraper` (ver M1 §1).

### 0.4 Trampas globales que el ejecutor debe evitar
1. **No inventar selectores CSS/XPath.** Descargar HTML real → fixture → inspeccionar → escribir
   selector → testear contra el fixture. *Para la RFEA y las federaciones ya cubiertas, partir
   del código existente que ya tiene los selectores validados (M1 §1).*
2. **Cada federación = un adaptador independiente con la misma interfaz.** Si uno rompe, los demás siguen.
3. **GitHub Actions corre en UTC.** Trabajar fechas con `zoneinfo("Europe/Madrid")`. Cron a las
   22:00 España en verano = `0 20 * * *` UTC.
4. **Runners efímeros y sin estado.** Todo estado (hashes vistos, qué se procesó) en Supabase.
5. **Free tier de Gemini con rate limits.** Token bucket propio + backoff exponencial ante 429.
   Límites vigentes en https://ai.google.dev/gemini-api/docs/rate-limits (leer de config, no hardcodear).
6. **PDFs heterogéneos.** No escribir un parser "perfecto" de entrada: pipeline + corpus de test + iterar.
7. **No usar Playwright si no hace falta.** Primero `httpx`. Cachear navegador con `actions/cache`.
8. **Codificación:** webs antiguas pueden servir `ISO-8859-1`/`windows-1252`. Detectar charset y
   normalizar a UTF-8 + **NFKC** antes de comparar nombres.
9. **Requests no agresivas.** 1 req/s por dominio, UA identificable, respetar `robots.txt`
   (leerlo, registrar la decisión; si bloquea rutas críticas, consultar al humano).
10. **El matching de identidad es el bug nº 1.** Ver §0.5 y M6: normalizar, tolerar orden
    "APELLIDOS, Nombre", restringir candidatos al universo de la prueba, umbral y cola de revisión.

### 0.5 Modelo de identidad (decisión cerrada — leer antes de M2/M6)
La licencia federativa **no siempre aparece** en los documentos. Por tanto:

- **Clave natural maestra:** `(nombre_completo_normalizado, fecha_nacimiento)`.
  - `nombre_completo_normalizado`: mayúsculas, sin tildes (NFKD→ascii), NFKC, espacios
    colapsados, y **orden canónico** que tolere "APELLIDOS, Nombre" vs "Nombre Apellidos"
    (resolver a una forma estable; además guardar el set de tokens para comparación order-insensitive).
  - `fecha_nacimiento`: `date` cuando la fuente la da completa.
- **Licencia:** columna *nullable*. Cuando existe y valida el patrón de su federación, es señal
  **fuerte** de identidad (funde aunque el nombre varíe de grafía).
- **Degradación** (lo más común en actas):
  1. Solo **año de nacimiento** → matching `(nombre_normalizado, anio_nacimiento)`.
  2. **Ni fecha ni año** → matching difuso por nombre **restringido a los atletas inscritos en
     esa misma prueba/competición** (rapidfuzz ≥ 0.92). Único candidato → match con confianza
     reducida; 0 o >1 → `revision_manual`.
- **Verificación en M1:** documentar empíricamente, por federación, **qué identificadores
  expone realmente** cada documento (fecha completa, solo año, categoría, licencia y su patrón).
  Esto condiciona la calidad del matching; si una federación no da ni año ni licencia, anotarlo
  como riesgo.

---

## M0 — Esqueleto del repositorio y entorno

**Objetivo:** repo con estructura, dependencias pinneadas, configuración y CI que corre los tests
sin tocar red.

### Estructura
```
fantasy-atletismo-engine/
├── .github/workflows/
│   ├── ci.yml                 # tests en cada push (sin red)
│   ├── inscritos.yml          # cron jue+vie
│   ├── resultados_live.yml    # cron sáb/dom tarde
│   ├── resultados_final.yml   # cron lunes mañana
│   └── mantenimiento.yml      # cron semanal: limpieza, canarios, keep-alive
├── src/engine/
│   ├── __init__.py
│   ├── config.py              # pydantic-settings: env vars
│   ├── models.py              # pydantic (Atleta, Resultado, Competicion, Inscrito…)
│   ├── identidad.py           # normalización de nombre + clave natural + matching base
│   ├── marcas.py              # parser de marcas → ms/cm enteros (tests exhaustivos)
│   ├── db.py                  # capa psycopg: upserts idempotentes
│   ├── storage.py             # subida de PDFs al bucket + limpieza
│   ├── http.py                # cliente httpx (PORTAR de calendar_scraper/http.py)
│   ├── alerting.py            # emails Resend + resumen de run
│   ├── llm/{client,schemas,prompts}.py
│   ├── pdf/{extract,chunk}.py
│   ├── adapters/
│   │   ├── base.py            # interfaz FederacionAdapter (ABC)
│   │   ├── rfea.py            # PORTAR de calendar_scraper/rfea.py
│   │   ├── galicia.py         # PORTAR de calendar_scraper/fuentes/galicia.py
│   │   ├── larioja.py         # PORTAR de calendar_scraper/fuentes/larioja.py
│   │   ├── andalucia.py       # PORTAR de fuentes_spa/andalucia.py (Playwright)
│   │   ├── madrid.py          # NUEVO
│   │   └── …                  # resto de federaciones (ver §Federaciones)
│   ├── pipeline/{discover,acquire,parse,reconcile,ingest}.py
│   └── jobs/{run_inscritos,run_live,run_final,run_mantenimiento}.py
├── tests/
│   ├── fixtures/{rfea,madrid,andalucia,galicia,…}/   # HTML y PDFs reales
│   ├── fixtures/gold/                                 # transcripciones gold por PDF
│   ├── test_identidad.py  test_marcas.py
│   ├── test_adapters_*.py  test_pdf_extract.py
│   ├── test_parse_llm_schema.py  test_reconcile.py
├── scripts/{snapshot,replay}.py
├── migrations/*.sql
├── requirements.txt  pyproject.toml  .env.example  README.md
```

### Instrucciones
1. Repo privado. `.gitignore` (Python + `.env` + `*.pdf` fuera de fixtures).
2. `requirements.txt` pinneado. Inicial: `httpx`, `selectolax`, `pdfplumber`, `google-genai`,
   `pydantic`, `pydantic-settings`, `psycopg[binary]`, `supabase`, `rapidfuzz`, `tenacity`,
   `python-dateutil`, `pytest`, `pytest-httpx`, `pytest-socket`, `playwright` (navegador solo en
   los workflows que lo usen).
3. `config.py` (`pydantic-settings`): `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
   `GEMINI_API_KEY`, `GEMINI_RPM`, `GEMINI_RPD`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `ENV`
   (`dev`/`prod`), `DRY_RUN` (bool).
4. `ci.yml`: instala deps y corre `pytest` con `pytest-socket` activado (cero red, cero API).
5. `.env.example` documentando cada variable.

### Criterios de aceptación
- `pytest` pasa en CI con 0 llamadas de red (verificado con `pytest-socket`).
- `python -m engine.jobs.run_inscritos --dry-run` arranca, lee config y termina sin excepción.

### Trampas
- Para inserciones masivas usar `psycopg` (`execute_values`); el SDK solo para Storage.
- `DRY_RUN` desde el día 1: todos los jobs deben correr "en seco" sin ensuciar la DB.

---

## M1 — Reconocimiento + reutilización del scraper existente (fixtures antes que código)

**Objetivo:** (a) **portar** el scraper ya probado de `calendar_scraper`; (b) corpus de fixtures
reales; (c) `RECON.md` por federación. Este hito mezcla código (portado) y documentación.

### 1. Reutilización de `calendar_scraper` (repo `lanedataweb`)
Existe un scraper **funcional y en producción** que ya resuelve el descubrimiento y los inscritos
de varias fuentes. Inventario y destino:

| Origen (`lanedataweb/calendar_scraper/`) | Qué hace (ya probado) | Destino |
|---|---|---|
| `http.py` | cliente httpx, throttle 1 req/s/dominio, UA, follow redirects | `engine/http.py` (añadir: retries tenacity, detección de charset, modo grabación) |
| `rfea.py` | calendario AJAX por mes (¡con la trampa del timestamp-como-selector-de-mes ya resuelta!), detalle (sfid, ámbito, fechas, documentos, `url_resultados`, `url_directo`), `_pruebas()`, `parse_inscritos_tabla()`, paginación de inscritos | `adapters/rfea.py` envuelto en la ABC |
| `fuentes/galicia.py`, `fuentes/larioja.py` | listados HTML estáticos | `adapters/galicia.py`, `adapters/larioja.py` |
| `fuentes_spa/andalucia.py` | SPA Blazor vía Playwright (iterar pestañas de mes, leer `.card`) | `adapters/andalucia.py` |
| `models.py` | `Competicion`, `Prueba`, `Inscrito`, `Documento`, `Inscripcion` | base de `engine/models.py` (ampliar con identidad) |
| `geo.py` | ciudad/sede → comunidad autónoma | `engine/geo.py` o util de adapters |
| `merge.py` | dedup por fecha + similitud de nombre (Jaccard de tokens) | `engine/pipeline/` (dedup de competiciones entre fuentes) |

**Trampa de reutilización crítica:** el `Inscrito` actual extrae
`nombre, apellidos, club, pais, categoria, marca_inscripcion, fecha_marca, lugar_marca`
pero **NO licencia ni fecha de nacimiento**. Para el motor hay que:
- Revisar en los fixtures reales si la tabla de inscritos / el detalle de RFEA exponen **fecha o
  año de nacimiento** y **licencia** en alguna columna/campo no capturado hoy, y ampliar el parser.
- Si no los exponen, registrarlo en `RECON.md`: ese atleta caerá en la ruta de matching difuso (M6).

### 2. Instrucciones de recon
1. `scripts/snapshot.py`: dado un URL, descarga (con `http.py`), guarda HTML crudo + dump del DOM
   renderizado con Playwright si difieren, y registra status, charset, headers, redirecciones.
2. Por federación, capturar y commitear como fixtures:
   - Calendario/competiciones.
   - Detalle de una competición pasada con resultados publicados.
   - **≥ 3 PDFs de inscritos y ≥ 3 de resultados de pruebas distintas** (velocidad con viento,
     fondo, concursos, con DNS/DNF/DQ visibles). **Buscar deliberadamente formatos distintos**
     (multi-columna, cabeceras repetidas, series) porque no hay un formato único.
   - Si hay "resultados en directo": capturar la página y, con Playwright + `page.on("response")`,
     registrar las respuestas XHR/fetch JSON. Guardarlas como fixtures y anotar el patrón de URL
     (la API oculta es el tesoro).
3. `RECON.md` por federación: mapa de URLs, patrón de enlaces a PDFs (regex empírica), si requiere
   JS, charset, estructura del JSON live, **qué identificadores expone cada documento (fecha/año de
   nacimiento, licencia y su patrón, categoría)**, y rarezas.
4. **Punto de control humano:** si una web tiene Cloudflare/captcha o `robots.txt` prohibitivo,
   PARAR y reportar opciones, no evadir.

### Criterios de aceptación
- Adapters RFEA/Galicia/Rioja/Andalucía portados y con tests offline contra fixtures en verde.
- ≥ 6 PDFs reales por federación con resultados (idealmente variados) y ≥ 3 HTML.
- `RECON.md` responde por federación: "dado el rango del próximo finde, ¿cómo obtengo la lista de
  competiciones, sus documentos y **qué identificadores de atleta trae cada documento**?"

### Trampas
- No saltarse el recon "porque ya sé scrapear": el 80% de los fallos vienen de HTML no verificado.
- Fixtures pesados: si los PDFs superan ~50 MB, usar Git LFS o un subset.
- **Al portar, no degradar lo que ya funciona**: el manejo de la trampa del calendario AJAX de la
  RFEA (el primer parámetro es el selector de mes, no anti-caché) debe conservarse intacto.

---

## M2 — Esquema de base de datos (Supabase `engine`)

**Objetivo:** esquema PostgreSQL completo con migraciones versionadas (`migrations/*.sql`).
**Identidad por `(nombre, fecha_nacimiento)`; licencia como apoyo.**

```sql
create table federaciones (
  id text primary key,            -- 'rfea' | 'madrid' | 'andalucia' | …
  nombre text not null,
  base_url text not null
);

create table competiciones (
  id bigint generated always as identity primary key,
  federacion_id text references federaciones(id),
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  lugar text,
  comunidad text,
  url_detalle text,
  url_inscritos text,
  url_resultados text,
  estado text not null default 'descubierta',
    -- descubierta | inscritos_ok | live_parcial | finalizada | error
  hash_descubrimiento text,
  unique (federacion_id, nombre, fecha_inicio)
);

-- ATLETAS: clave natural = (nombre_normalizado, fecha_nacimiento). Licencia = apoyo opcional.
create table atletas (
  id bigint generated always as identity primary key,
  nombre_normalizado text not null,   -- NFKC, mayúsculas, sin tildes, orden canónico
  fecha_nacimiento date,              -- null si la fuente no la da
  anio_nacimiento smallint,           -- fallback cuando solo hay año
  nombre_original text,
  sexo text,                          -- 'M' | 'F' | null
  club text,
  licencia text,                      -- nullable; señal fuerte cuando existe
  tokens_nombre text[],               -- para comparación order-insensitive
  updated_at timestamptz default now()
);
-- Unicidad por clave natural cuando hay fecha completa
create unique index atletas_nat_fecha on atletas (nombre_normalizado, fecha_nacimiento)
  where fecha_nacimiento is not null;
-- Unicidad por (nombre, año) cuando solo hay año
create unique index atletas_nat_anio on atletas (nombre_normalizado, anio_nacimiento)
  where fecha_nacimiento is null and anio_nacimiento is not null;
-- Licencia única cuando existe (dedup fuerte)
create unique index atletas_licencia on atletas (licencia) where licencia is not null;

create table pruebas (
  id bigint generated always as identity primary key,
  competicion_id bigint references competiciones(id) on delete cascade,
  nombre text not null,           -- '100m', '1500m', 'Longitud'…
  sexo text,                      -- 'M' | 'F' | 'X' | null
  categoria text,
  unique (competicion_id, nombre, sexo, categoria)
);

create table inscripciones (
  prueba_id bigint references pruebas(id) on delete cascade,
  atleta_id bigint references atletas(id),
  marca_inscripcion text,
  marca_inscripcion_ms integer,   -- ms (carreras) o cm (concursos), entero
  puesto_previsto integer,
  confianza numeric,              -- 1.0 si match por clave fuerte; <1 si difuso
  primary key (prueba_id, atleta_id)
);

create table resultados (
  prueba_id bigint references pruebas(id) on delete cascade,
  atleta_id bigint references atletas(id),
  marca text,                     -- crudo, o 'DNS'/'DNF'/'DQ'/'NM'
  marca_ms integer,               -- null si DNS/DNF/DQ
  viento numeric,
  puesto_final integer,
  estado text not null,           -- 'OK' | 'DNS' | 'DNF' | 'DQ' | 'NM'
  es_definitivo boolean not null default false,  -- false=live, true=PDF oficial
  fuente text not null,           -- 'json_live' | 'html' | 'pdf_llm'
  confianza numeric,
  updated_at timestamptz default now(),
  primary key (prueba_id, atleta_id)
);

create table runs (
  id bigint generated always as identity primary key,
  job text not null,              -- 'inscritos' | 'live' | 'final' | 'mantenimiento'
  started_at timestamptz default now(),
  finished_at timestamptz,
  ok boolean,
  resumen jsonb                   -- contadores, errores por adaptador, tokens LLM, urls
);

create table documentos (
  id bigint generated always as identity primary key,
  competicion_id bigint references competiciones(id),
  tipo text not null,             -- 'inscritos' | 'resultados'
  url_origen text,
  sha256 text not null unique,    -- idempotencia
  storage_path text,
  procesado_ok boolean,
  created_at timestamptz default now()
);

create table revision_manual (
  id bigint generated always as identity primary key,
  motivo text not null,           -- 'identidad_dudosa' | 'parse_incoherente' | 'pdf_no_parseable' | …
  payload jsonb not null,
  resuelto boolean default false,
  created_at timestamptz default now()
);
```

Bucket de Storage `pdf-historico` (privado). Limpieza a 15 días por el job semanal (listar y
borrar > 15 días): el free tier **no** tiene lifecycle rules nativas.

### Criterios de aceptación
- Migraciones aplicadas; `db.py` con funciones tipadas: `upsert_competicion`,
  `resolver_o_crear_atleta` (devuelve `atleta_id` aplicando la cascada de identidad de M6),
  `upsert_inscripciones`, `upsert_resultados(definitivo: bool)`, con `ON CONFLICT` correcto.
- Test de idempotencia: insertar el mismo lote dos veces deja exactamente las mismas filas.
- Regla de oro en `ingest.py`: **un resultado `es_definitivo=true` nunca es sobrescrito por uno
  `es_definitivo=false`** (el live no pisa al PDF oficial). `true→true` sí puede actualizarse (con log).

### Trampas
- Marcas: **NO** parsear tiempos con float. `marcas.py` → enteros (ms / cm), soportando `ss.cc`,
  `m:ss.cc`, `h:mm:ss`, concursos en metros (`7.45`→745 cm), y no-numéricos (`DNS/DNF/DQ/NM/SC`).
  Tests unitarios exhaustivos.
- Identidad: normalizar nombre (NFKD→ascii, mayúsculas, NFKC, orden canónico) y fecha **antes** de
  cualquier comparación o inserción. La normalización vive en `identidad.py` y se testea sola.

---

## M3 — Capa HTTP, adaptadores y descubrimiento

**Objetivo:** `python -m engine.jobs.run_inscritos --dry-run --solo-descubrir` imprime las
competiciones del próximo finde de todas las federaciones soportadas.

### Instrucciones
1. `http.py` (partiendo del `http.py` portado): timeout 20 s, 3 reintentos (tenacity, backoff +
   jitter) solo para red/5xx (no 404), throttle 1 req/s por dominio, UA identificable, detección de
   charset (header → meta → `chardet`), modo grabación en `ENV=dev` (`tests/fixtures/_cache/`).
2. `adapters/base.py` — interfaz:
```python
class FederacionAdapter(ABC):
    id: str
    def descubrir_competiciones(self, desde: date, hasta: date) -> list[CompeticionDescubierta]: ...
    def localizar_documentos(self, comp) -> Documentos: ...   # urls inscritos/resultados (pdf/html) + live
    def extraer_live(self, comp) -> list[RegistroResultado] | None: ...   # Capa 1, opcional
```
   Los adapters portados (RFEA, Galicia, Rioja, Andalucía) se **envuelven** en esta interfaz: su
   lógica `listar(...)` actual alimenta `descubrir_competiciones`; el detalle de RFEA
   (`enriquecer`, `_pruebas`, inscritos) alimenta `localizar_documentos`/inscritos.
3. Implementar cada adaptador **contra los fixtures de M1**, con tests que parsean el HTML guardado
   y comprueban competiciones/URLs esperadas (valores anotados a mano en M1).
4. Ventana temporal: "próximo finde" = vie–dom siguientes en `Europe/Madrid`; `--desde/--hasta`
   para overrides y reprocesos.
5. Filtrado anti-histórico: descartar lo fuera de ventana; loggear lo descartado.
6. Adapters con JS (Andalucía y los que documente M1): aislarlos; Playwright solo en sus workflows.

### Criterios de aceptación
- Tests offline por adaptador (fixtures) en verde.
- Dry-run real un jueves: lista las competiciones reales del finde con URLs de inscritos.
  Verificación humana una vez.
- Si una federación falla, las demás completan (errores aislados, recogidos en `runs.resumen`).

### Trampas
- Páginas intermedias (circular → documento final): seguir con límite de profundidad 2 y registro
  de la cadena de URLs.
- URLs relativas: `urljoin` contra la URL de la página, nunca concatenar strings.

---

## M4 — Adquisición en cascada (live JSON → HTML → PDF)

**Objetivo:** dado un `Documentos` de M3, obtener registros crudos por la vía más barata, con
degradación automática.

### Instrucciones
1. `pipeline/acquire.py` — cascada por competición y tipo de documento:
   - **Capa 1 (JSON live):** si M1 documentó API oculta, llamar al endpoint, validar contra modelo
     pydantic del JSON, devolver registros `fuente='json_live'`, `confianza=1.0`.
   - **Capa 2 (HTML):** si está en tabla HTML, parsear determinísticamente. `fuente='html'`, `1.0`.
   - **Capa 3 (PDF):** descargar → `sha256` → si existe en `documentos`, **skip total** → subir a
     Storage → pasar a M5. `fuente='pdf_llm'`.
   - Cada capa que falla loggea motivo estructurado y cae a la siguiente. Si fallan todas →
     `runs.resumen` y, al final del job, alerta (M7).
2. Validación cruzada con 2 fuentes (live domingo + PDF lunes): comparar; discrepancia de
   puesto/marca de un atleta → gana el PDF (definitivo) y la discrepancia va a `revision_manual`.
3. PDF nuevo o cambiado: el `sha256` es la verdad. Resubida corregida con misma URL → hash distinto
   → reproceso y sobrescritura (permitido `definitivo→definitivo`, con log).

### Criterios de aceptación
- `scripts/replay.py --pdf tests/fixtures/rfea/resultados_X.pdf` ejecuta Capa 3 end-to-end offline
  (LLM mockeado) y produce registros.
- Test: mismo PDF dos veces → la segunda no llama al LLM ni escribe (contador de mock = 0).

### Trampas
- No descargar el PDF a memoria sin límite: stream a disco temporal con tope (~30 MB).
- "PDF" que en realidad es HTML de error con extensión `.pdf`: validar magic bytes `%PDF` antes.

---

## M5 — Parseo de PDFs con pdfplumber + Gemini (hito crítico, go/no-go)

**Objetivo:** convertir cualquier PDF de inscritos/resultados en registros validados con tasa de
error ≈ 0 sobre el corpus de fixtures. **No hay un formato único de PDF:** el pipeline se diseña
para iterar sobre un corpus que crece, no para acertar a la primera.

### 5.1 Extracción determinista (sin LLM)
1. `pdf/extract.py`: `pdfplumber` página a página con `extract_text(layout=True)`. Probar también
   `extract_tables()`: si hay líneas de tabla y la extracción tabular es coherente (mismo nº de
   columnas en >90% de filas), **preferir la vía tabular determinista y saltarse el LLM**
   (confianza 1.0, 0 tokens) para ese formato.
2. Limpieza: eliminar líneas repetidas en ≥ N páginas (cabeceras/pies, "Página X de Y") por
   frecuencia, no por contenido hardcodeado.
3. Segmentación por prueba: detectar encabezados con regex construidas desde el corpus
   (`100\s?m`, `1\.?500`, `Longitud`, "Serie", "Final", sexo/categoría). Cada chunk = una prueba o
   serie. **Nunca enviar el PDF entero al LLM:** chunks pequeños = menos alucinación, menos tokens.

### 5.2 LLM (solo para chunks no parseables determinísticamente)
1. `llm/client.py`: token-bucket local (límites de config, no hardcodeados), reintentos ante
   429/5xx con backoff, contador de requests del run en `runs.resumen`, modo mock para tests.
2. **Structured output obligatorio**: `llm/schemas.py` define el schema. Campos del registro:
   `{nombre: str, apellidos: str|null, fecha_nacimiento: date|null, anio_nacimiento: int|null,
   licencia: str|null, club: str|null, marca: str, puesto: int|null,
   estado: 'OK'|'DNS'|'DNF'|'DQ'|'NM', viento: float|null}`. Pasar como `response_schema` con
   `response_mime_type='application/json'`. **Capturar fecha/año de nacimiento si el PDF los trae**
   (clave para la identidad, M6).
3. Prompt (`llm/prompts.py`, versionado, versión guardada junto a cada resultado): rol estricto,
   prohibición de inventar, `null` cuando el campo no aparezca, y **2-3 few-shots reales** del
   corpus (incluyendo una línea con DNS y otra con nombre largo que descoloca columnas).
4. **Verificación post-LLM (lo que da el "0% de error"):**
   - Validar con pydantic (tipos, enums).
   - Coherencia del chunk: puestos sin huecos imposibles (1,2,2,4 ok por ex aequo; 1,7,8
     sospechoso), marcas ordenadas coherentemente con los puestos (menor tiempo = mejor puesto;
     tolerar series), nº de registros ≈ nº de líneas de atleta del chunk. Desviación > 10% →
     reintento con prompt de corrección una vez → si persiste, chunk a `revision_manual`, no se ingiere.
   - Licencia extraída debe matchear el patrón regex de esa federación (M1); si no, se anula y se
     pasa a identidad por nombre/fecha (M6).
5. Costes: tokens por run en `runs.resumen`.

### Criterios de aceptación
- Sobre TODO el corpus (≥ 6 PDFs variados por federación): `scripts/replay.py --all` produce
  registros que coinciden con un **gold standard** anotado a mano (`tests/fixtures/gold/*.json`,
  2-3 pruebas por PDF). Exactitud: **100% en nombre+fecha/año de nacimiento cuando el PDF los
  expone**, 100% en estados DNS/DNF, 100% en puestos, ≥ 99% en marcas.
- Test sin red: schema y verificación post-LLM con respuestas mockeadas (incluyendo una corrupta
  que debe acabar en `revision_manual`).

### Trampas
- `layout=True` es lento en PDFs grandes: página a página, no reabrir el PDF por chunk.
- PDFs escaneados (imagen): detectar (`extract_text()` casi vacío con páginas no vacías) → marcar
  `pdf_no_parseable_ocr` y alertar; **sin OCR en el MVP**.
- Few-shots no enormes: el prompt por chunk debe quedarse en pocos miles de tokens.
- Ex aequo, viento por serie (no por atleta), atletas extranjeros sin licencia ni fecha española:
  contemplados en el schema (`null`) y en los gold files. Estos últimos caerán a matching difuso.

---

## M6 — Reconciliación e ingesta (identidad por nombre + fecha de nacimiento)

**Objetivo:** registros crudos → filas correctas en `inscripciones`/`resultados`, resolviendo la
identidad del atleta con la cascada cerrada en §0.5.

### Cascada de resolución de identidad (`reconcile.py` → `db.resolver_o_crear_atleta`)
Por cada registro:
1. **Licencia presente y válida** (patrón de la federación, de M1) → buscar atleta por licencia.
   - Existe → ese atleta. Backfill de `fecha_nacimiento`/`nombre_original`/`club` si faltaban.
   - No existe → crear atleta con licencia + nombre + fecha si la hay.
2. **Sin licencia, con fecha de nacimiento completa** → match exacto por
   `(nombre_normalizado, fecha_nacimiento)`. Existe → ese atleta; no → crear.
3. **Sin licencia, solo año** → candidatos = atletas con `nombre_normalizado` igual y mismo año
   (de `anio_nacimiento` o derivado de `fecha_nacimiento`). Único → match; varios → difuso/revisión.
4. **Sin licencia ni fecha ni año** → **fuzzy por nombre restringido a los atletas inscritos en esa
   misma prueba/competición** (rapidfuzz ≥ 0.92, comparación order-insensitive con `tokens_nombre`
   y tolerando "APELLIDOS, Nombre"). Único candidato → match con `confianza` reducida; 0 o >1 →
   `revision_manual` (motivo `identidad_dudosa`), nunca inserción silenciosa.

> Regla: **un atleta nuevo solo se crea en los pasos 1-3** (identidad fuerte o fecha). El paso 4
> nunca crea atletas nuevos a ciegas (evita duplicar por errores de OCR): si no casa con nadie
> conocido del universo de la prueba, va a revisión.

### Resto del pipeline
1. **Puesto previsto (job inscritos):** ordenar inscripciones de cada prueba por
   `marca_inscripcion_ms` asc (carreras) / desc (concursos); sin marca → al final. Asignar
   `puesto_previsto` 1..N y **congelarlo** (no recalcular el lunes).
2. **Unificación de series (job final):** todas las series/semifinales/finales de una misma
   prueba+sexo+categoría en la misma competición se unifican: si hay "Final", manda para los
   finalistas y el resto se ordena por marca; si solo hay series "contra el crono", ordenar el
   total por `marca_ms`. **Documentar la regla elegida como constante comentada y testeada** (es
   regla de juego, debe ser explícita).
3. **DNS/DNF/DQ:** DNS → `puesto_final=null`, `estado='DNS'`. DNF/DQ → estado correspondiente,
   puesto tras los clasificados si el acta lo da, null si no. El motor registra la verdad; la
   penalización la decide el juego.
4. **Ingesta:** upserts en una transacción por competición. `es_definitivo` según job. Actualizar
   `competiciones.estado`.

### Criterios de aceptación
- Tests (sintéticos + reales): serie con DNS intercalado, dos series unificadas, ex aequo, atleta
  con licencia que funde dos grafías distintas del nombre, atleta sin licencia con fecha que matchea,
  atleta solo con año único, atleta sin nada con match difuso único, atleta sin nada ambiguo
  (→ `revision_manual`).
- Re-ejecución del job final sobre la misma competición no cambia nada (idempotente).
- **Test de no-duplicación de identidad:** el mismo atleta llegando dos findes con grafías ligeramente
  distintas del nombre pero misma fecha de nacimiento → una sola fila en `atletas`.

### Trampas
- El paso 4 (difuso) es el de mayor riesgo de error: umbral alto (≥ 0.92), universo restringido a la
  prueba, y ante la mínima duda → revisión. Nunca relajar el umbral para "no dejar nada en revisión".
- Orden de apellidos: muchas actas usan "APELLIDO1 APELLIDO2 NOMBRE" o "APELLIDOS, Nombre". La
  normalización debe producir una forma estable y guardar `tokens_nombre` para comparar sin depender
  del orden.

---

## M7 — Orquestación en GitHub Actions + alertas + exportación

**Objetivo:** todo corre solo en la nube, con observabilidad, alertas solo cuando importan, y
exportación de datos para los consumidores (web/juego).

### Workflows (crons en UTC; recordar CET/CEST, elegir horas con margen)
- `inscritos.yml`: jue y vie `0 18 * * 4,5` UTC (≈19-20h España). checkout → setup-python con cache
  pip → (cache Playwright solo si algún adapter lo requiere) → `python -m engine.jobs.run_inscritos`.
- `resultados_live.yml`: sáb y dom, 2-3 pasadas (`0 12,16,20 * * 6,0` UTC). Solo Capa 1/2; sin live
  termina silenciosamente.
- `resultados_final.yml`: lunes `0 7 * * 1` y reintento martes `0 7 * * 2` (si quedan competiciones
  sin estado `finalizada`).
- `mantenimiento.yml`: `0 6 * * 3` (limpieza Storage > 15 días, purga `_cache`, `runs` > 90 días,
  canarios de estructura M8, keep-alive del cron).
- Todos: `timeout-minutes: 20`, `concurrency` con `cancel-in-progress: false` y grupo por job,
  `workflow_dispatch` con inputs (`desde`, `hasta`, `dry_run`, `federacion`) para rescates manuales.
- Secrets: `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`,
  `RESEND_API_KEY`, `ALERT_EMAIL_TO`.

### Exportación para consumidores (web y juego)
- Tras `inscritos`/`final`, exportar un **JSON canónico** (competiciones + pruebas + inscripciones +
  resultados del rango relevante) a un artefacto estable que la web pueda consumir en build:
  - Opción recomendada: commitear `public/data/*.json` en este repo o publicarlo como release/Pages
    artifact, y que `lanedataweb` lo lea (ver `02-lanedataweb.md`). Mantiene a la web sin tocar la DB.
  - Alternativa: la web/juego leen el Supabase `engine` directamente (service key en build). Más
    acoplado; usar solo si se necesita frescura en runtime.
- El formato exportado debe ser **estable y versionado** (un campo `schema_version`): es el contrato
  con la web y el juego.

### Alertas y observabilidad
1. `alerting.py` (Resend): email **solo** si (a) fallan todas las capas de una competición esperada,
   (b) excepción no controlada del job, (c) > X entradas nuevas en `revision_manual`. Los éxitos no
   mandan email; quedan en `runs`.
2. Cada job escribe su fila en `runs` con resumen JSON: competiciones, registros, fuente por
   competición, tokens LLM, errores, entradas a revisión.
3. **Keep-alive:** GitHub desactiva crons en repos sin actividad ~60 días. El job de mantenimiento
   hace un commit trivial o usa la API para re-habilitar; documentarlo en el README.

### Criterios de aceptación
- `workflow_dispatch` con `dry_run=true` ejecuta el pipeline completo en Actions; el log muestra el
  resumen sin escrituras.
- Forzar un fallo (URL rota) → llega exactamente 1 email con contexto.
- Un finde completo < 60 min de Actions (presupuesto ~240 min/mes ≪ 3.000).
- El JSON exportado valida contra su `schema_version` y lo consume `lanedataweb` sin cambios manuales.

---

## M8 — Endurecimiento y operación

**Objetivo:** que el sistema sobreviva meses sin tocarlo.

1. **Canarios de estructura** (en `mantenimiento.yml`): descargar la página de calendario de cada
   federación y comprobar invariantes (status 200, ≥ 1 enlace que matchee el patrón de competición).
   Fallo → email "la web de X ha cambiado, revisar adaptador". Te enteras el miércoles, no el sábado.
2. **Modo degradado documentado:** si un adaptador muere, el README describe el rescate:
   `workflow_dispatch` de `replay` subiendo el PDF a mano al bucket (el job lo detecta por hash nuevo
   y lo procesa). Única intervención manual prevista; no requiere desplegar nada.
3. **Versionado de prompts y regresión:** cualquier cambio de prompt/modelo exige pasar
   `replay --all` contra los gold files antes de mergear (job CI manual con secret de Gemini, para no
   gastar cuota en cada push).
4. **Ampliar corpus continuamente:** el job final guarda cada PDF 15 días; una vez al mes, mover 1-2
   PDFs "raros" (los que generaron `revision_manual`) a fixtures + gold files. El parser mejora con
   el deporte real, no con suposiciones. **Esto es esencial dado que los PDFs no son homogéneos.**
5. **Checklist de nueva federación:** repetir M1 (recon + fixtures, **incluyendo qué identificadores
   expone**) → implementar adaptador → tests → añadir a la matriz del workflow. Nada más debería cambiar.

---

## Federaciones a soportar

El plan original traía 3 de ejemplo (RFEA, Madrid, Andalucía). **Deben estar todas las de España.**
La RFEA agrega los campeonatos *nacionales y autonómicos* en su calendario, pero los **resultados**
(PDF/live) y a menudo los inscritos detallados viven en cada federación autonómica. Cobertura objetivo:

| Federación | Web (verificar en M1) | Estado de partida |
|---|---|---|
| RFEA | atletismorfea.es | ✅ portado de `calendar_scraper` |
| Andalucía | atletismofaa.es / web.faalive.com | ✅ portado (Playwright/SPA) |
| Galicia | atletismo.gal | ✅ portado (HTML) |
| La Rioja | fratletismo.com | ✅ portado (HTML) |
| Madrid | atletismomadrid.com | 🟡 nuevo (sus ctos. entran vía RFEA; sus resultados, no) |
| Cataluña | (PDF) | ⛔ nuevo, recon en M1 |
| Comunidad Valenciana | (SPA) | 🟡 nuevo |
| Canarias | (calendario JS) | 🟡 nuevo |
| Castilla-La Mancha | (PHP) | 🟡 nuevo |
| Castilla y León, Aragón, Asturias, Baleares, Cantabria, Extremadura, Murcia, Navarra, País Vasco, Ceuta, Melilla | (verificar) | ⛔ nuevo, recon en M1 |

> **Importante:** las URLs y métodos de las federaciones **no verificadas** se confirman
> empíricamente en M1 (fixtures + `RECON.md`). No escribir adapters de memoria. Priorizar por volumen
> de competiciones y por si su acta trae fecha de nacimiento/licencia (mejor identidad).

---

## Apéndice A — Orden de ejecución y dependencias
```
M0 ──► M1 ──► M2 ──┬─► M3 ──► M4 ──► M5 ──► M6 ──► M7 ──► M8
                   └─(M2 puede solaparse con M1)
```
Hito de no-retorno (go/no-go): **M5 con criterios cumplidos.** Si la exactitud no llega al umbral
tras iterar el corpus, replantear (más extracción determinista, otro modelo) antes de construir M6+.

## Apéndice B — Salvaguardas anti-error
| Riesgo | Salvaguarda |
|---|---|
| Inventar selectores/URLs | M1 obliga a fixtures reales; adapters base portados ya validados |
| Alucinación del LLM | Structured output + few-shots + verificación de coherencia + gold files |
| Duplicados al re-ejecutar | sha256 de documentos + UPSERT por claves naturales + tests idempotencia |
| **Duplicar atletas / identidad** | Clave `(nombre, fecha_nac)` + licencia como apoyo + fuzzy restringido + revisión |
| Live pisa al oficial | Regla `es_definitivo` en ingest + test específico |
| Cron a deshora | Todo en `Europe/Madrid`, crons en UTC documentados con nota CET/CEST |
| Rate limit Gemini | Token bucket + backoff + chunks pequeños + vía determinista preferente |
| **PDFs heterogéneos** | Sin formato único asumido; corpus que crece + vía tabular + revisión de lo raro |
| Web cambia y nadie se entera | Canarios semanales + alertas solo-fallo |
| Estado perdido entre runs | Cero estado en runner; todo en Supabase |
| Costes ocultos | Contadores de tokens/minutos en `runs.resumen`; limpieza automática de Storage |
