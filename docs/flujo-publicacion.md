# Flujo de publicación de lanedata

Cómo pasar de una historia a **artículo publicado + carrusel de Instagram** en minutos,
y qué viene después (radar de noticias).

## Las piezas

### 1. Plantillas editoriales (`/admin/nuevo`)

Al crear un artículo, encima del área de HTML hay cuatro plantillas de un clic:

| Plantilla | Para qué |
|---|---|
| **Crónica** | Cobertura de una competición: ficha técnica, relato, tabla de resultados |
| **Análisis** | Pieza de datos: caja "Las claves", gráficos, tabla histórica, nota metodológica |
| **Breve** | Noticia corta de 3 párrafos con bloque de datos |
| **El Dato** | Una sola cifra reveladora explicada a fondo |

Usan las clases `.ld-*` de `app/globals.css` (entradilla, claves, datos destacados,
cita, ficha, nota metodológica, firma), así que el artículo sale con formato de
periódico sin escribir CSS. Las plantillas viven en `lib/plantillas.ts`.

### 2. Estudio IG (`/admin/estudio`)

Editor de carruseles 1080×1350 con la identidad de lanedata:

- **6 tipos de diapositiva**: Portada (con imagen de fondo opcional), Dato, Ranking,
  Texto, Cita y Cierre. Tres temas (ink / paper / mint) y tres tamaños de titular.
- **Desde un artículo**: elige un artículo de Supabase y te monta portada + cierre
  con su título, excerpt, imagen y URL.
- **JSON**: carga/copia las diapositivas como JSON (es el puente con
  `generar_previa.py`).
- **Exportar**: descarga los PNGs listos para subir a Instagram y genera el caption
  con hashtags (botón «Generar desde diapositivas» → «Copiar»).
- El borrador se guarda solo en `localStorage` (sobrevive a recargas).

La exportación es propia (`components/admin/estudio/exportSlide.ts`, sin
dependencias): serializa la diapositiva (estilos 100 % inline) a SVG con las fuentes
embebidas y la rasteriza en canvas. Si cambias las fuentes de `globals.css`,
actualiza `FONT_CSS_URL` ahí.

> Nota: para usar una imagen de fondo en la portada, la URL debe permitir CORS
> (las de Supabase Storage valen; una URL cualquiera puede fallar al exportar).

### 3. La Previa semanal (`scripts/generar_previa.py`)

Contenido semi-automático a partir del calendario que ya scrapeamos:

```bash
python scripts/generar_previa.py                    # próximo fin de semana
python scripts/generar_previa.py --desde 2026-07-24 --hasta 2026-07-26
```

Genera en `previa_out/` (gitignorado):

- `previa_<fecha>.html` — borrador del artículo (nacional + por comunidades, con
  enlaces) listo para pegar en el admin. Busca los marcadores `[✍️ AÑADE AQUÍ…]`
  y mete tu análisis: atletas a seguir, duelos, mínimas en juego.
- `previa_<fecha>_ig.json` — carrusel de 4 diapositivas → Estudio IG > JSON > Cargar.
- `previa_<fecha>_meta.txt` — título, slug, excerpt y caption sugeridos.

## El flujo completo (viernes por la mañana, ~15 min)

1. `python scripts/scrape_calendar.py` (si el JSON está viejo)
2. `python scripts/generar_previa.py`
3. Admin → Nuevo artículo → pegar HTML + meta → completar los `[✍️ AÑADE AQUÍ…]` → Publicar
4. Admin → Estudio IG → JSON → cargar `previa_*_ig.json` → retocar → Descargar todas
5. Subir PNGs + caption a Instagram
6. «Publicar web» (rebuild en GitHub Actions)

## Hoja de ruta: radar de noticias (siguiente fase)

El objetivo: que los **resultados** (no solo el calendario) generen historias.

1. **Scraper de resultados RFEA** — las competiciones del JSON ya traen
   `url_resultados`; un script tipo `scripts/scrape_resultados.py` que los recoja
   el domingo/lunes.
2. **Base histórica** — guardar marcas por atleta/prueba/año (SQLite o JSON en
   `public/data/`) para poder comparar.
3. **Detector de historias** — reglas sobre esa base: récords de España/autonómicos,
   mínimas de campeonatos internacionales logradas, mejores marcas personales de
   atletas top-20, saltos de ranking. Salida: informe de "las 5 historias del lunes"
   con los datos ya extraídos, en el mismo formato JSON del Estudio IG.
4. **Rankings World Athletics** — para contexto internacional (puntos, posiciones).

Con eso, el lunes por la mañana tendrías el equivalente a `generar_previa.py` pero
de crónica: `generar_resumen.py`, con las historias detectadas y sus carruseles.
