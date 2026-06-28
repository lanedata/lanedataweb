# Planes del ecosistema lanedata

Planificación para estructurar y arrancar los tres proyectos del ecosistema y su capa de datos.
**Empezar siempre por `00-ecosistema.md`.**

| Documento | Repo destino | Qué cubre |
|---|---|---|
| [`00-ecosistema.md`](./00-ecosistema.md) | — (maestro) | Visión, las 3 capas, reutilización del scraper actual, identidad de atleta, arquitectura de datos, orden de ejecución |
| [`01-engine.md`](./01-engine.md) | `fantasy-atletismo-engine` | Motor de datos: scraping + inscritos + resultados (PDF/LLM) + reconciliación + ingesta. Hitos M0–M8 |
| [`02-lanedataweb.md`](./02-lanedataweb.md) | `lanedataweb` (este) | Migrar el calendario de scraper propio a consumir el motor, sin dejar de ser estático |
| [`03-fantasy-game.md`](./03-fantasy-game.md) | `fantasy-game` | El juego (ligas, plantillas, puntuación). App dinámica que comparte el Supabase del motor |

## Decisiones cerradas
- **Identidad de atleta:** `(nombre_completo_normalizado, fecha_nacimiento)`; licencia como señal de
  apoyo opcional. Degradación a (nombre+año) y a fuzzy restringido + revisión manual.
- **Scraping consolidado en el motor:** se porta el `calendar_scraper` ya probado; la web deja de scrapear.
- **Topología de repos:** 3 repos. El `fantasy-game` es repo propio (app dinámica) y comparte el
  proyecto Supabase del motor (esquema `game`).
- **Datos:** el motor es la fuente canónica. La web consume su JSON exportado; el juego lee sus tablas.
- **Coste 0 €:** GitHub Actions + Supabase Free + Gemini Free + Resend Free.

## Pendiente operativo
- Mover `01-engine.md` y `03-fantasy-game.md` a sus repos respectivos (o ejecutarlos desde una
  sesión abierta en cada repo). El repo `fantasy-atletismo-engine` ya tiene vinculadas las APIs de
  Claude/GitHub/Supabase.
