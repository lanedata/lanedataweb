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
