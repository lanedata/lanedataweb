# Plan de integración: lanedataweb consume el motor de datos
### Repo: `lanedataweb` (este) · Objetivo: que el calendario deje de scrapear y lea del motor

> Contexto en `00-ecosistema.md`. Este plan **no se ejecuta hasta que el motor
> (`fantasy-atletismo-engine`) produzca datos fiables** (al menos competiciones + inscritos;
> idealmente resultados). Hasta entonces, el `calendar_scraper` actual sigue funcionando intacto:
> no se rompe nada. La migración es incremental y reversible.

## Estado de partida (lo que ya hay)

- `calendar_scraper/` (Python): scraper RFEA + Galicia + La Rioja + Andalucía → produce
  `public/data/competiciones.json` y `federaciones_spa.json`.
- `lib/competiciones-data.ts`: lee ese JSON en build time (`loadCompeticiones()`).
- `lib/competiciones.ts`: tipos `RfeaCompeticion`.
- Páginas: `app/calendario/`, `app/calendarapp/`, `app/admin/calendario/`, portada.
- Workflows: `deployv2.yml` (build estático → GitHub Pages, refresca el scraper RFEA) y
  `scrape-spa.yml` (Playwright para SPAs).
- La web es **export estático** (`output: 'export'`) en GitHub Pages. **Se conserva así.**

## Decisión

El motor pasa a ser la **fuente canónica** de competiciones/inscritos/resultados. La web:
1. Consume el **JSON canónico exportado por el motor** (ver `01-engine.md` M7) en build time, en el
   mismo punto donde hoy lee `competiciones.json`.
2. Se mantiene **estática y gratis** en GitHub Pages (no toca la DB en runtime).
3. **Retira** su propio `calendar_scraper` una vez el motor sea fiable.

Por qué consumir JSON y no leer Supabase directo: la web es estática; un artefacto JSON versionado
mantiene el build simple, sin secretos de DB, y desacopla los ritmos de despliegue.

## Fases (incrementales y reversibles)

### Fase 0 — Contrato de datos (coordinar con el motor)
- Acordar con el motor el **esquema del JSON canónico** (`schema_version`, lista de competiciones
  con pruebas/inscripciones/resultados y los campos que la web necesita: nombre, fecha, lugar,
  comunidad, disciplina, url_detalle/resultados/directo, pruebas, estado…).
- Verificar que ese formato **cubre lo que hoy renderiza** la web (mapear campo a campo contra
  `RfeaCompeticion` en `lib/competiciones.ts`). Si falta algo que la web muestra, añadirlo al
  export del motor (no parchear en la web).
- **Criterio:** documento corto `docs/contrato-datos-motor.md` con el mapeo de campos.

### Fase 1 — Adaptador de lectura, sin quitar nada todavía
- Añadir una fuente de datos alternativa en `lib/competiciones-data.ts`: una función que lee el
  JSON del motor (desde una URL/artefacto del repo del motor, o un fichero commiteado por un
  workflow de sincronización). Mantener `loadCompeticiones()` como interfaz estable para las
  páginas (no tocar las páginas todavía).
- Si el JSON del motor no está disponible, **fallback** al `competiciones.json` actual (cero
  downtime). Mismo patrón defensivo que ya usa el scraper.
- **Criterio:** con un JSON del motor de muestra, la web renderiza el calendario igual o mejor que
  hoy (comparación visual de `app/calendario/`).

### Fase 2 — Sincronización del JSON del motor → web
- Un workflow en este repo (o un paso en `deployv2.yml`) que, antes del build, **trae el JSON
  canónico del motor**:
  - Opción A (recomendada): el motor publica el JSON como **release asset o Pages artifact**; la
    web lo descarga en build con `curl`/`actions`. Sin acoplar repos por escritura.
  - Opción B: el motor hace push del JSON a una ruta de este repo vía workflow (requiere token
    cruzado). Más acoplado; usar solo si A no encaja.
- **Criterio:** el deploy diario produce un calendario alimentado por el motor, con el scraper
  antiguo aún presente como respaldo.

### Fase 3 — Retirada del scraper propio
- Cuando Fase 2 esté estable varias semanas: eliminar `calendar_scraper/`, `scripts/scrape_*.py`,
  el job `scrape-spa.yml` y los pasos Python de `deployv2.yml`. La web queda **solo Next.js + JSON
  del motor** (build más rápido, menos dependencias).
- Conservar `lib/competiciones.ts` (tipos) y `lib/competiciones-data.ts` (ahora leyendo solo el
  JSON del motor).
- **Criterio:** build verde sin Python; el calendario sigue idéntico para el usuario final.

## Trampas
- **No romper el calendario durante la transición.** Cada fase mantiene un fallback al dato
  anterior hasta que la nueva fuente esté verificada.
- **El contrato JSON es la fuente de verdad del acoplamiento.** Si la web necesita un campo nuevo,
  se añade en el export del motor y se versiona (`schema_version`), no se calcula en la web.
- **No mover la web a hosting dinámico** por esto: el objetivo es justo lo contrario, que siga
  estática y gratis consumiendo un artefacto.
- **El admin de calendario** (`app/admin/calendario/`): revisar qué hace hoy. Si solo visualiza,
  seguirá leyendo el JSON. Si edita/anota, decidir si esas anotaciones viven en la web o se
  trasladan al motor (probablemente al motor, para que el juego también las vea).

## Relación con el resto del ecosistema
- La web **no** conoce al `fantasy-game` ni al revés; ambos cuelgan del motor. Si en el futuro se
  quisiera enlazar (p. ej. un widget de "tu liga" en la web), se haría vía el motor o un enlace
  simple, sin acoplar despliegues.
- Mantener el branding compartido (`infotrack/lanedata-brand/`) como referencia visual común a los
  tres proyectos.
