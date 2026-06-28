# Notas del proyecto — Generador de podios → Stories

## Qué hace
Scraper de resultados de atletismo → genera vídeo 9:16 (8 s) del podio (top 3) para Instagram Stories.

## Decisiones tomadas
- Vídeo **animado** MP4 vertical **9:16** (1080×1920), **8 segundos**.
- Nombres: **nombre + primer apellido**.
- Solo pruebas con estado **"Oficial"** (finalizadas) por defecto; casilla para ver todas.
- Estética **estilo lanedata**: verde oscuro, acento lima, etiquetas mono, resultado grande, foto opcional del ganador.
- Foto opcional del ganador → diseño con foto; sin foto → diseño alternativo.
- Web accesible desde móvil y compartible con el equipo.

## Estado actual
- ✅ Scraper conersyslive.es (podios) — validado en contenido real, **falta 1 prueba en vivo**.
- ✅ Diseño con/sin foto, sin solapes nombre/marca.
- ✅ Vídeo animado 8 s.
- ✅ Web local (Flask): `app.py` + `engine.py` + `render_podio.py`.
- ⏳ Probar en el PC de Riki (instalar Python → arrancar).

## Pendientes / ideas
- [ ] **(2026-06-24) Compartir directo a X/Instagram desde el móvil — HECHO el código, falta probar.**
      Botón "📤 Compartir" en `app.py` (junto a "⬇ Descargar" en vídeo e imagen) que usa la Web
      Share API del navegador (`navigator.share`) para abrir el panel nativo de compartir del
      móvil con el archivo + un caption automático (función JS `caption(i)`, monta prueba/ronda/
      competición/fecha/podio con club+marca+etiquetas PB-SB-récord). Sin coste, sin API de pago.
      Limitaciones a tener en cuenta:
        - Requiere HTTPS. No funciona abriendo la web por la IP local del PC desde el móvil
          (eso no cuenta como "contexto seguro"); solo funciona ya desplegado online (o con un
          túnel HTTPS temporal tipo ngrok para probar antes de desplegar).
        - Con X funciona de forma fiable (vídeo e imagen). Con Instagram, la imagen funciona bien;
          el vídeo a Stories vía este mecanismo NO está garantizado (depende del teléfono) --
          si hace falta que el vídeo a Instagram sea 100% fiable, la única vía garantizada es la
          API oficial de Meta (cuenta Business + revisión de Meta + hosting público del vídeo).
      Pendiente: probarlo en el móvil real de Riki una vez esté desplegado en Render.
- [ ] **(2026-06-24) Desplegar online en Render + login** — decidido con Riki: Render (no Vercel,
      por los límites de las funciones serverless frente a los ~4,3M filas de ranking en memoria
      y el render de vídeo con ffmpeg). Código ya preparado:
        - Login simple usuario/contraseña (`app.py`: rutas `/login`/`/logout`, gate `before_request`).
          Usuarios en variable de entorno `APP_USERS` (formato `usuario:contraseña,usuario2:...`),
          nunca en el código. En local sin esa variable cae a `admin/admin` (solo desarrollo).
        - `requirements.txt` y `render.yaml` (plantilla de despliegue, plan Standard 2GB RAM,
          disco persistente de 5GB en `/data`, comando `gunicorn app:app`).
        - `cruce_local.py`: nuevo `DATA_DIR` (variable de entorno) para que los JSON grandes y la
          caché `indice_nacional.pkl` vivan en el disco persistente de Render (`/data`) en vez de
          en el propio código (GitHub rechaza ficheros >100MB, y varios ranking_nacional_*.json
          pesan 60-234MB cada uno -- no se pueden subir al repo en absoluto).
        - `.gitignore` para no subir nunca `clave.json.json` (credencial Firestore) ni esos JSON grandes.
      Pendiente (acción manual de Riki, no delegable): crear cuenta en Render, conectar el repo de
      GitHub, definir `SECRET_KEY`/`APP_USERS` en el panel de Render, y subir los JSON grandes +
      `clave.json.json` al disco `/data` (NO por git -- por SCP/shell de Render o subiéndolos a un
      enlace temporal y descargándolos desde la shell del servicio).
- [ ] **(2026-06-24) Volcado masivo / "botón maestro" por competición** — idea de Riki, pensando en
      profesionalizar el flujo para quien administra el contenido de un campeonato grande
      (ej. Cto. España): pegar el link de resultados UNA vez y generar de golpe el contenido de
      TODAS las pruebas oficiales con podio, en lugar de prueba por prueba. Diseño CERRADO con
      Riki el 2026-06-24, pendiente de implementar:
        - Genera **vídeo + imagen** para cada prueba oficial con podio.
        - **Sin foto** en el lote (diseño 3 columnas) — no hay fotos pre-subidas para 40 atletas.
        - Carpeta de salida **automática**: `salidas/<nombre-competición>_<fecha>/` dentro del
          proyecto (no hace falta elegir ruta cada vez).
        - Nomenclatura: `prueba_sexo_ronda_competición_fecha.mp4` / `.png`
          (ej. `100m_H_Final_CtoEspanaAbsoluto_2026-06-24.mp4`).
        - Las piezas CON foto se siguen haciendo a mano, una por una, igual que ahora (subir+recortar),
          pero se guardan en la subcarpeta `con_foto/` dentro de la carpeta de la competición, con
          sufijo `_con_foto` antes de la extensión — para no mezclarlas con el archivo completo sin foto
          ni arriesgar confundir versiones.
      Falta por decidir en la implementación: cómo se deriva el slug de "competición" para el nombre
      de carpeta/archivo (¿del título que da el scraper? ¿lo escribe el usuario?), y cómo abreviar
      sexo/ronda cuando el scraper no los da explícitos (ej. rfealive.es no siempre distingue ronda).
- [ ] **Soporte para worldathletics.org** (ej. https://worldathletics.org/competition/calendar-results/results/7234117).
      Es una web distinta y moderna (probablemente app JavaScript + API interna), así que
      necesita su PROPIO módulo de scraping, separado del de conersys. Investigar su API.
- [ ] **Conectar con la BD del equipo (otra rama, scraper semanal)** para calcular puntos
      IAAF y detectar resultados relevantes (mínima internacional, carrera de alto nivel,
      récords, MMP). Necesita: tablas de puntuación World Athletics (coeficientes por
      prueba/sexo, verificar), mínimas del campeonato objetivo (por temporada), acceso al
      esquema de la BD y emparejado de atletas (nombre vs ID). Mostrar como badges estilo
      lanedata en el vídeo y/o lista de "resultados destacados" en la web.
### Estructura de la Firestore (proyecto manager-atletismo / marca = lanedata)
Colecciones relevantes:
- `admarathonUploads` (marcas del club por año) y `ctosEspanaUploads` (Ranking nacional, ~314k filas):
  subcolección `chunks` con campo `rows` = lista JSON plana. Campos por marca:
  club, viento, genero, fechaNac, atleta (MAYÚSCULAS), prueba (ej. '60m','100 m'),
  lugar, categoria (Absoluta, Sub20...), fecha, pos, marca.
- `rankingEspanaUploads` y `rankingUploads` (rankings España por año, históricos): chunks con
  campo `bytes` = CSV comprimido en GZIP (hay que descomprimir).
- `minimasCtoEspana`: doc `2026` = mínimas nacionales (entries: prueba, sexo, categoria, minima,
  minimaRepesca, admitidos); doc `INT_EUR_ABS_2026` = mínimas internacionales Europeo
  (minimas: minimaEa, minimaRfea, prueba, sexo, categoria, fechas).
- `ctosEspanaRankings`: doc 2026 con effectiveMinimas + payload comprimido; doc INT_EUR_ABS_2026.
- `groups` (grupos del club, atletas con nombre+normalizado+fechaNac), `inscritosComps`, `kv` (calendarios),
  `meetingsAbiertos`.
Lectura: con firebase-admin + clave de servicio (clave.json), corre en el PC/servidor (no desde el sandbox).

### Qué se puede cotejar (scraper vs BD)
- Mínima nacional → minimasCtoEspana/2026 ; Mínima internacional → minimasCtoEspana/INT_EUR_ABS_2026. OK.
- Nº1 ranking absoluto/categoría → comparar contra ctosEspanaUploads/rankingUploads (por prueba/sexo/categoría/año). OK.
- Récord de España → NO hay colección de récords; habría que aproximar con la mejor marca histórica
  (rankingEspanaUploads) — NO equivale al récord oficial RFEA. CLARIFICAR fuente.
- Puntos IAAF → NO están en la BD; calcular con tablas World Athletics 2025 (módulo aparte).
Reto principal: normalizar nombres de PRUEBAS (scraper '100 m Hombres' vs BD '100 m'+genero) y de
ATLETAS (casar por nombre normalizado + año de nacimiento; el scraper también trae fechaNac).
Especificación de material en pruebas (peso martillo, altura vallas) va en el nombre de la prueba del
scraper → una marca solo cuenta para la mínima/ranking de su categoría si usa el material de esa categoría.

### Pipeline de datos del equipo (docs/plan-carga-semanal.md, rama rankings-espana-advance)
Pipeline semanal `scripts/carga_global_datos_mundoatletismo.sh` (13 steps): scrape RFEA (rfea_espana_v4.py)
→ espana_<año>.csv + admarathon_<año>.csv → builds (rankings.py, build_ctos_espana.ts, aggregates,
novedades, medallistas) → sube a Firestore (mismo proyecto manager-atletismo).
REUTILIZAR estas fuentes ya existentes (no recalcular) para que los números coincidan con su web:
- Puntos IAAF: scripts/out/iaaf_scoring.json (+ src/data/iaaf_combined_scoring.json para combinadas).
- Récord de España: src/data/recordsEspana.json (scrapeado de atletismorfea.es, COMMITEADO).
- Mínimas nacionales+internacionales: Firestore minimasCtoEspana (+ validación calendario WA).
- Ya existe agg_novedades_fin_semana: top-3 IAAF + mínimas internacionales de la semana → nuestro cruce
  es la versión por-competición/tiempo-real orientada a vídeo de ese agregado.

### HALLAZGO CLAVE (repo C:\Proyectos\manager-atletismo, rama main-adm, src/lib)
La lógica del cruce YA EXISTE y es madura, en TypeScript:
- src/config/categorias.ts: bandas por edad (Sub8 6-7…Sub23 20-22, Absoluta 23-34, Master 35+, por
  AÑO NATURAL de la marca) + categoriaEfectiva (lisas/saltos=edad atleta; vallas/lanzam=categoría de
  competición; mujer disco=edad). Resuelve el matiz de material por categoría.
- src/lib/marks.ts: parseMarkToNum, isHigherBetter, computePbSb (MMP+SB), pruebaBaseKey/pruebaKey
  (clave canónica de prueba), dedupeRawMarks, stripDiacritics para normalizar atletas.
- src/lib/minimas.ts: pruebaKey muy completo, pruebaKeysForMinima (110/100, deca/hepta por sexo),
  isVientoValido (<=2.0), pistaReal/aplicaParaPista (indoor), esElegiblePorEdad +
  requiereCatCompeticionGteAtleta + umbralCatComp (material por categoría), classifyForMinima (ranking).
- recordsEspana.json (récords). Puntos IAAF: NO en main-adm; en pipeline (rama scripts) con iaaf_scoring.json.
CONCLUSIÓN: NO reinventar en Python (riesgo de drift). El cruce debe hacerse en TS/Node reutilizando
estos módulos. Decisión de arquitectura a alinear con Santi: scraper+cruce como script Node en su repo;
vídeo seguir en Python alimentado por la salida del cruce, o portarlo a Node (@napi-rs/canvas ya está).
Mis cruce.py/records_espana.py/puntos_iaaf.py validaron la lógica pero NO son la vía de producción.

- [ ] Alojar el motor en la nube (Cloud Run / Firebase) para acceso del equipo.
- [ ] Marca definitiva: logo del club (sustituir "tu marca"), color de acento, tipografías exactas
      (Clash Display + mono) vía CDN.
- [ ] Publicación en Stories (manual / Metricool / API Meta) — decidir más adelante.
- [ ] FUTURO: linkear con Twitter/X para publicar posts con imagen automáticamente (además de IG Stories).

---

## PUESTA AL DÍA / HANDOFF (estado actual)

Carpeta de trabajo: `F:\Claude\Cuadro mandos global\Web manager atletismo`
Repo del proyecto del equipo: `C:\Proyectos\manager-atletismo` (rama datos: `rankings-espana-advance`).

### Cómo se usa
`python app.py` → abre http://localhost:5000 → pegas la URL de una competición
(conersyslive.es **o** atletismomadrid.com) → la web detecta la fuente, lista las
pruebas finalizadas/oficiales con su podio, muestra arriba una caja **"Destacados"**
(mínima/récord/MMP/nº1) y deja generar un vídeo 9:16 de 8s por prueba (con foto
opcional encuadrable). Requiere los exports (abajo) en la misma carpeta.

### Archivos y qué hace cada uno (todos en la carpeta de trabajo)
- `app.py` — web local (Flask). Detecta fuente por la URL, /api/events, /api/video, /debug.
  Llama a `anotar_destacados()` (cruce) y enseña el resumen arriba + pruebas relevantes primero.
- `engine.py` — scraper conersyslive.es (parse_schedule / parse_event). Podio top-3.
  PENDIENTE: no captura fechaNac (limita el cruce en conersys).
- `scraper_fam.py` — scraper atletismomadrid.com (HTML estático). Trae licencia + fechaNac +
  categoría + club. Podio = 3 MEJORES MARCAS de las finales (no por puesto de serie).
- `render_podio.py` — genera el vídeo MP4 9:16 8s (con/sin foto). Fuentes en `fonts/`.
- `cruce.py` — "cerebro" del cruce (flags: MMP, MEJOR_TEMPORADA, MINIMA, RECORD_ESPANA, N1_*).
- `cruce_local.py` — capa de datos del cruce: lee exports + records y llama al cerebro.
  Incluye `aplanar()` (salida de scraper -> filas) usado por la web.
- `records_espana.py` / `puntos_iaaf.py` — lectores de récords y de la tabla IAAF.
- `cruce_competicion.ts` — BORRADOR (TypeScript) para que el equipo lo integre en su repo
  reutilizando sus módulos. Alternativa "oficial" al cruce en Python.
- `exportar_bd.py` — exporta de Firestore (con `clave.json`): minimas + marcas del club.
- Datos generados (necesarios para el cruce): `marcas_club.json` (18.948 marcas),
  `minimas_nacional.json`, `minimas_internacional.json`, `recordsEspana.json`.

### Qué funciona YA (probado con datos reales)
- Vídeo 8s con/sin foto. Dos scrapers integrados con auto-detección.
- Cruce por nuestra cuenta (sin Santi, sin IAAF): MMP, mejor del año, mínima (nac+int), récord.
  El resumen sale en la web. MMP solo si el atleta está en la BD del club (no inventa para rivales).

### Pendiente (se puede hacer sin el equipo)
- **Puntos IAAF**: generar `iaaf_scoring.json` corriendo `scripts/extract_iaaf_scoring.py`
  del repo (necesita el PDF de docs/ + `pdftotext`/poppler). Verificar 48.11 400mv = 1226.
- Capturar fechaNac en el scraper conersys (`engine.py`) para que su cruce sea completo.
- Validar la regla fina de "material por categoría" en mínimas (Sub18 con material Sub20)
  contra la web del club (en `cruce_local.elegible` está simplificado).

### ✅ Hecho (2026-06-22): regla del viento + fondo claro de la web
- Viento favorable > +2.0 m/s anula la marca a efectos de MMP/SB/mínimas/récord/Nº1
  (`cruce.viento_anula`, aplicado en `cruce.analizar_resultado` y al construir los índices
  PB/SB/ranking en `cruce_local.construir_indices`). El viento en contra nunca anula.
  El campo "viento" ahora viaja desde el scraper -> `app.py:anotar_destacados` /
  `cruce_local.aplanar` -> `cruce_local.analizar_competicion` -> `cruce.analizar_resultado`.
  Pendiente (cuando se note falta): mostrar en la web/vídeo cuándo una marca se ha anulado
  por viento (hoy solo deja de contar para los hitos, pero no se avisa explícitamente).
- Fondo de la web cambiado a claro (estilo Claude Cowork: crema `#F5F3EC`, tarjetas blancas,
  texto oscuro, verde más oscuro como acento para mantener contraste). El degradado oscuro
  que se ve al encuadrar la foto (`addOverlay` en `app.py`) NO se ha tocado a propósito:
  simula el fondo del VÍDEO final, que sigue siendo oscuro por diseño.

### ✅ Hecho (2026-06-22): alcance nacional + Nº1 + reparto de etiquetas
- `cruce_local.py` ya NO se limita a `marcas_club.json`: el MMP/SB/Nº1 se calcula contra
  TODO el ranking nacional 2020-2026 (`ranking_nacional_<año>.json`, ~4,3M filas) + club.
  Índice cacheado en `indice_nacional.pkl` (≈90s la primera vez, instantáneo después).
- Caja "Destacados" (resumen global, `app.py:anotar_destacados`): solo cuentan Nº1 del año
  (absoluto o de categoría), mínima internacional (o repesca) y récord de España. NI "marca
  personal" (MMP) NI "mejor del año" (SB) cuentan solas para el resumen global.
- Tabla por prueba (los 3 del podio): siempre se muestra si hubo PB o SB (si hay PB, el SB
  queda implícito y NO se muestra aparte — ver `cruce.analizar_resultado`), más los hitos del
  resumen global que ese atleta haya conseguido.

### ✅ Hecho (2026-06-22): 2 bugs de cruce/viento encontrados y arreglados
- **Bug grave (Conersys nunca enlazaba con la BD)**: `engine.py` calculaba el nombre completo
  del atleta ("Maria CAMPOS BRAVO") pero solo guardaba la versión recortada para mostrar
  ("Maria Campos"), descartando el completo. La BD guarda el nombre con TODOS los apellidos,
  así que la clave de cruce nunca coincidía → cero destacados/MMP/SB siempre, para cualquier
  competición en formato Conersys. Arreglado guardando ambos: `nombre` (corto, para mostrar)
  y `atleta` (completo, para cruzar) en `engine.py` → `app.py:anotar_destacados` →
  `cruce_local.analizar_competicion` (usa `atleta` para la clave, `nombre` para lo que se
  muestra). Verificado con test simulando el caso exacto.
- **Viento de carreras en FAM no se capturaba**: confirmado con una captura real de
  atletismomadrid.com (Semifinal 1) que en carreras el viento NO está en la celda de cada
  atleta (esa celda solo trae "q" de clasificado o va vacía) sino en la CABECERA de la columna
  ("Viento -1.7", un único valor para toda la serie). En saltos (longitud/triple) sí viene en
  la celda de cada atleta/intento. `scraper_fam.py:parse_event` ahora saca el viento de la
  celda si es un número, y si no, cae al de la cabecera de esa tabla/serie. Verificado con HTML
  de prueba reproduciendo la captura.
- Drops de "viento" al cruzar formatos también arreglados: `app.py:eventos_desde_fam` filtraba
  las claves del podio FAM y perdía "viento" antes de llegar a `anotar_destacados`.
- Pendiente sin confirmar (no afecta a lo de arriba): si hay alguna otra columna de FAM con el
  mismo patrón "valor solo en cabecera, celda vacía" además del viento.

### ✅ Hecho (2026-06-23): atletas extranjeros no cuentan en hitos de nacionalidad española
- Decisión con Riki: un atleta extranjero nunca puede ser líder español (Nº1 absoluto/categoría),
  ni hacer récord de España, ni nos interesa si cumple mínimas internacionales -- son logros
  ligados a representar a España. MMP y mejor marca del año SÍ se mantienen (son personales,
  no dependen de nacionalidad).
- `cruce.py:es_extranjero(pais)` nuevo: True si el país normalizado no es España/Spain/ESP/ES.
  Sin dato de país -> asumimos que NO es extranjero (failure mode seguro: como mucho se le
  aplican de más hitos nacionales, nunca se le quitan los suyos personales).
- `analizar_resultado()` corta antes de calcular MINIMA/MINIMA_REPESCA/RECORD_ESPANA/N1_ABSOLUTO/
  N1_CATEGORIA si `extranjero` es True (después de calcular MMP/MEJOR_TEMPORADA, que sí se quedan).
- Origen del dato de país: en Conersys, el campo que parecía ser "club" (`upcoming-table__label`)
  en realidad es la NACIONALIDAD ("Spain", "Germany"...) -- confirmado con Riki en
  https://conersyslive.es/Results/Schedule?chid=2026AND65850, donde TODOS los españoles aparecen
  como "Spain" y no con su club real. `engine.py` ahora guarda ese campo también como `"pais"`.
  En FAM no tenemos este dato hoy -> `pais=None` -> tratado como no-extranjero.

### ✅ Hecho (2026-06-23): club real del atleta buscado en la BD (checkbox en la web)
- Como Conersys solo da la nacionalidad (ver arriba) y no el club real, se añadió un índice
  `club_idx` en `cruce_local.py:construir_indices()` (mismo bucle que ya construye pb/sb/ranking):
  `{atleta_normalizado -> club de la temporada MÁS RECIENTE que tengamos de él}`, leyendo el
  campo `club` de `marcas_club.json` + `ranking_nacional_<año>.json`. Cacheado junto al resto en
  `indice_nacional.pkl`.
- `cruce_local.cargar_todo()` ahora devuelve también `club_idx` (7 valores en vez de 6) y se añadió
  `cruce_local.buscar_club_actual(atleta, club_idx)` como helper de búsqueda.
- `app.py:anotar_destacados` rellena `p["club_real"]` en cada atleta del podio antes de construir
  los destacados.
- En la web (`app.py` PAGINA): checkbox nuevo "Mostrar club real (buscado en la BD) en vez de
  'Spain'/país (Conersys)" (id `clubreal`, sin marcar por defecto = se sigue mostrando lo que
  trae el scraper, modo "selecciones"). Al marcarlo, `pintar()` usa `p.club_real` si lo
  encontramos, con fallback a `p.club` si no hay match en la BD.
- Pendiente: si el atleta no está en la BD (rival de otro club, nunca ha competido con nosotros),
  `club_real` queda vacío y se cae al campo `club` original (nacionalidad en Conersys).

### ✅ Hecho (2026-06-24): etiquetas de hitos en el vídeo
Las 3 decisiones que quedaban abiertas (ver versión anterior de esta nota, más abajo) se
cerraron con Riki y ya están implementadas:
  1. **Sufijo de categoría**: estilo internacional U18/U20/U23 (Absoluta sin sufijo; Master
     se abrevia "Mas" -- no hay banda fina M35/M40 calculada hoy en `categoria_por_edad()`,
     revisar si algún día se necesita más precisión). Mapeo en `cruce.SUFIJO_CATEGORIA`.
  2. **Mínima**: formato abreviado corto "Mín.Eur" / "Mín.Mun" + sufijo de categoría si
     aplica (ej. "Mín.Eur U20"). Heurística sobre el texto de `label` en `cruce._abrevia_minima()`
     (busca "eur"/"mun" en el texto; de momento solo hay datos de Europeo en
     `minimas_internacional.json`, ajustar si aparece otro ámbito).
  3. **Varios hitos a la vez**: se muestran TODAS las etiquetas que apliquen, sin límite
     (Riki rechazó explícitamente limitar a 2 etiquetas por atleta).

**Jerarquía de implícitos** (decisión 2026-06-24, ampliando la de "PB implica SB" que ya
existía): si hay RÉCORD DE ESPAÑA, no se muestran "PB" ni "SB" por separado (el récord ya
implica ambos). Si no hay récord, sigue aplicando que PB implica SB. Mínima(s) internacional(es)
y líder español (Nº1) son hitos de OTRO eje (no de progresión de marca) y se muestran siempre
que apliquen, sin verse afectados por esta jerarquía.

**Dónde vive cada pieza:**
- `cruce.etiquetas_video(out)`: pura lógica, a partir de `out["flags"]` + `out["categoria_edad"]`
  (que ya pone `cruce_local.analizar_competicion`) devuelve la lista final de strings a pintar,
  en orden (récord/PB/SB, luego mínima(s), luego LE).
- `app.py` / `anotar_destacados()`: tras calcular `analizados` (1:1 con `podio`, mismo orden),
  cuelga `p["etiquetas"] = cruce.etiquetas_video(a)` en cada fila del podio -- así viaja solo
  dentro del JSON normal de `/api/events` y `gen()` lo manda a `/api/video` sin tocar esa ruta.
- `render_podio.py` / `sp_row()`: lee `p.get("etiquetas")` y las pinta como píldoras (función
  `_pills_row`) debajo del club, con salto de línea automático si no caben en una sola fila.

**Pendiente, NO tocado en este cambio** (queda para otra sesión):
- Viento sigue grande en el vídeo, sin reajustar tamaño (era un pedido aparte, no relacionado
  con las etiquetas).
- No se ha probado aún con un caso real con varias etiquetas largas a la vez para ver si
  rompe el layout en 2 líneas dentro del alto de fila disponible -- revisar con un vídeo real
  generado desde la web antes de darlo por cerrado del todo.

### ✅ Hecho (2026-06-24): mejoras de UI (página inicial + resultados) + imagen para Twitter/X
De las 6 sugerencias de UI propuestas, Riki rechazó la 1 (auto-detección de fuente por URL) y
la 2 (validación de URL en vivo); aceptó la 3, 4, 5, 6 y pidió además un botón nuevo. Todo
implementado en `app.py` (CSS + HTML + JS embebidos en `PAGINA`) y `render_podio.py`:
- **(3) Loader animado**: mientras `/api/events` carga, `#loader` muestra un corredor en
  pixel-art (bloques CSS puros, sin sprites/imágenes) saltando 3 vallas en bucle
  (`@keyframes runJump`/`rSwing`/`hurdleMove`), con mensaje de estado rotando cada 1.3s
  (`mostrarLoader()`, `LOADER_MSGS`).
- **(4) Buscador**: input `#filtro` (aparece tras la primera carga) filtra `pintar()` por
  substring del nombre de la prueba.
- **(5) Indicador de generado**: `genBadges(i)` pinta "✓ vídeo" / "✓ imagen" en cada tarjeta
  según los Sets `generados.video` / `generados.img` (en memoria, se resetea al recargar).
- **(6) Agrupación Oficiales/Pendientes**: `pintar()` separa el listado en dos bloques vía
  `seccion()`; si la casilla "Solo oficiales" está marcada, el bloque Pendientes no se pinta
  en absoluto (no solo se oculta).
- **Botón nuevo "🐦 Imagen Twitter"**: `genImg(i)` llama a `/api/imagen_twitter` (nueva ruta
  Flask, mismo payload que `/api/video` pero llamando a `render_podio.render_imagen()` en vez
  de `render()`). Genera una imagen **horizontal 1200×675 px (16:9)** -- tamaño recomendado
  por X para tarjetas `summary_large_image` -- con el mismo layout de podio a 3 columnas
  (rango/nombre/club/marca/viento/etiquetas), panel de foto opcional (~36% del ancho, con
  degradado de fundido) y bloque del podio centrado verticalmente entre título y pie
  (`render_podio.py:render_imagen()`, nuevo helper `_clip()` para recortar con "…" el nombre
  de club si no cabe en columnas estrechas -- bug real encontrado y arreglado al probar la
  variante con foto).
- Verificado: `app.py` compila sin errores (`py_compile`) y el JS embebido pasa `node --check`
  tras el refactor de `pintar()`/`tarjeta()`/`seccion()`.
- Pendiente (no pedido aún, posible mejora futura): los Sets de "generado" viven solo en
  memoria del navegador (se pierden al recargar la página); si interesa persistencia real
  habría que guardarlo en el backend o en localStorage.

### ✅ Hecho (2026-06-24): bug de cruce en rfealive.es (4º formato) — solo da la inicial del nombre
Riki reportó que en el 4º formato (rfealive.es, Blazor WASM) nunca aparecían MMP/SB/mínimas/récord/Nº1
para nadie. Causa: `scraper_rfea_es.py` solo recibe del origen la INICIAL del nombre de pila + apellido(s)
("J ARIAS GONZALEZ"), nunca el nombre completo (limitación de los datos de origen, ya documentada en el
propio scraper antes de este fix); la BD (`marcas_club.json`/`ranking_nacional_<año>.json`) guarda el
nombre completo ("Juan Arias Gonzalez"), así que la clave de cruce exacta (`normaliza(atleta)+"|"+prueba`)
nunca coincidía → cero destacados siempre para este formato, el mismo patrón de bug que el de Conersys
del 2026-06-22 pero con causa distinta (aquí el dato de origen es incompleto, no se pierde por el camino).

**Fix**: `cruce.clave_inicial(nombre_normalizado)` reduce cualquier nombre normalizado a "inicial +
apellido(s)" (ej. "juan arias gonzalez" -> "j arias gonzalez"); nombres completos (BD) y nombres
solo-con-inicial (rfealive.es) caen en la MISMA clave. `cruce_local.construir_indices()` construye un
nuevo índice `ini_idx` (clave_inicial -> set de nombres completos que reducen a ella), cacheado en
`indice_nacional.pkl` junto al resto (se añadió comprobación `"ini_idx" in data` al leer la caché para
forzar una reconstrucción única de cachés antiguas sin este campo). `cruce_local._resolver_nombre()`
(usado en `analizar_competicion()`) y `cruce_local.buscar_club_actual()` intentan este fallback SOLO
cuando la clave exacta no encuentra nada: si hay EXACTAMENTE UN nombre completo en la BD que reduzca a
esa clave de inicial, se usa ese; si hay 0 o varios candidatos (ambigüedad, ej. "Juan" y "Jose" Arias
Gonzalez), no se adivina — se queda sin destacados/club para ese atleta, mismo "failure mode seguro" que
`es_extranjero()` (mejor 0 destacados que atribuírselos al atleta equivocado).

Verificado con un test de integración simulado (no con datos reales de Firestore): nombre completo en BD
"Juan Arias Gonzalez" con PB de 100m + club, consultado como vendría del scraper ("J ARIAS GONZALEZ ") —
el fallback resuelve correctamente el PB y el club; al añadir un segundo atleta ambiguo ("Jose Arias
Gonzalez") al mismo índice, el fallback correctamente deja de resolver (sin adivinar). `cruce.py` y
`cruce_local.py` compilan sin errores (`py_compile`).

**Confirmado con competición real (2026-06-24, https://rfealive.es/sch/2026MAD65573, Liga Iberdrola
Final Permanencia)**: probado contra los 4 atletas de A.D. Marathon que aparecieron en podio. El campo
`atleta` crudo del scraper SÍ trae el/los apellido(s) completos, solo recorta el nombre de pila a inicial
(ej. "C GONZALEZ SEGUNDO", no "C GONZALEZ" — la hipótesis inicial de que rfealive.es también recortaba
apellidos era incorrecta). Resultado contra `indice_nacional.pkl` real:
  - "C GONZALEZ SEGUNDO" → único candidato "Carlota Gonzalez Segundo" → PB/SB encontrados (1.77 altura).
  - "A PARAJUA DELGADO" → único candidato "Ana Parajua Delgado" → PB/SB encontrados (3.91 pértiga).
  - "P GUERRA ESPINOSA" → único candidato "Patricia Guerra Espinosa" → PB/SB encontrados (4:31.42 en 1500m).
  - "A SANCHEZ MEDINA" → AMBIGUO a propósito (2 candidatas: Ada y Ana Sanchez Medina) → sin resolver,
    failure mode seguro funcionando como se diseñó.
En los 3 casos resueltos, el atleta marcó POR DEBAJO de su mejor marca/temporada ese día (Carlota 1.75 <
1.77, Ana Parajua 3.56 < 3.91, Patricia Guerra 4:38.13 > 4:31.42 -- peor tiempo), así que el resumen
"Destacados" vacío en esa competición es el resultado CORRECTO, no un bug: nadie hizo de hecho marca
personal/de temporada ese día (lógico en una final de permanencia, donde no suele buscarse el pico de
forma). **El fix queda confirmado funcionando con datos reales**, esta vez sí, sin reservas pendientes.

**Segunda confirmación real + bug nuevo encontrado y arreglado (2026-06-24, https://rfealive.es/sch/2026NAV65578)**:
Riki señaló a Pablo Rojo Castaño (2º en 400 m) como caso seguro de marca destacada, pero en la web aparecía
como "P. Rojo" (sin "Castaño") y temió que el recorte de nombre rompiera el cruce. Verificado con el dato
crudo real del scraper (`atleta` = "P ROJO CASTAÑO", confirmado por Riki ejecutando el diagnóstico): el
recorte a "P. Rojo" es SOLO de `nombre_corto()` para mostrar (`app.py` usa `p.get("atleta")` para cruzar,
nunca `nombre` cuando "atleta" existe — confirmado leyendo `anotar_destacados()`), así que esa sospecha
era infundada. El cruce resolvió bien: "p rojo castano" -> único candidato "pablo rojo castano" -> club
A.D. Marathon -> PB/SB real = 47.36 en 400m. El motivo de que no saliera ninguna etiqueta: hizo exactamente
47.36 en esa carrera -- IGUALÓ su marca personal al céntimo, sin bajarla, y `cruce.mejor()` usaba
comparación ESTRICTA (no contaba empates).

**Decisión con Riki**: igualar (sin superar) tu MMP/mejor del año SÍ debe destacarse en la tabla de cada
prueba (es relevante para el vídeo/resumen de esa prueba), pero NO debe contar para la caja "Destacados"
global ni desbloquear mínima/récord/Nº1 (un empate no cambia esos hitos respecto a antes).
- `cruce.analizar_resultado()`: además de "MMP"/"MEJOR_TEMPORADA" (mejora estricta), ahora detecta empate
  exacto (`v == mejor histórico`) y añade "IGUALA_MMP"/"IGUALA_SB" (mutuamente excluyentes con sus
  versiones de mejora real). El GATE que desbloquea mínima/récord/Nº1 ahora exige expresamente "MMP" o
  "MEJOR_TEMPORADA" (mejora real), NO solo "flags no vacío" -- un empate ya NO pasa el gate.
- `cruce.etiquetas_video()`: pinta "=PB"/"=SB" para los empates (jerarquía: récord > PB > SB > =PB > =SB).
- `app.py:anotar_destacados()`: el filtro de la caja global ahora excluye también "IGUALA_MMP"/"IGUALA_SB"
  además de "MEJOR_TEMPORADA"/"MMP" (antes solo excluía estas 2). La tabla por prueba (`e["destacados"]`)
  ya las incluye automáticamente (sigue siendo "cualquier flag no vacío").
- `app.py` (JS `flagText`): añadidas las traducciones `IGUALA_MMP:'=PB'`, `IGUALA_SB:'=SB'` al mapa `M`.
Verificado con caso real exacto (Pablo Rojo, empate a 47.36): `flags=['IGUALA_MMP']`, etiqueta "=PB". Con
mejora simulada (47.00): `flags=['MMP']`, etiqueta "PB". Con marca peor (47.90): `flags=[]`. Probado en
una copia fresca de `cruce.py` (`py_compile` limpio) por el bug de caché de bash documentado abajo.

**Nota recurrente sobre el entorno**: el bash de este sandbox sigue mostrando contenido OBSOLETO/TRUNCADO
de `cruce.py`/`app.py` tras editarlos (mismo bug ya documentado en sesiones anteriores: `wc -l`/`py_compile`
ven una versión antigua por mtime, aunque el fichero real en disco -- confirmado con `Read` -- está completo
y correcto). Workaround de siempre: copiar el contenido verificado por `Read` a un fichero nuevo en el
scratch y validar ahí. No es un bug de código, es un artefacto del entorno.

### ✅ Hecho (2026-06-24): mensaje explícito cuando no hay destacados
La caja "Destacados" se quedaba vacía/oculta cuando no había nada que resaltar, sin distinguir
ese caso de "el cruce no ha cargado". `app.py:renderResumen()` ahora pinta un aviso explícito
("No hay ninguna marca destacada (récord, mínima internacional o líder nacional) en esta
competición.") cuando `d.resumen` está vacío, en vez de dejar la caja en blanco. Verificado con
copia sintética (`py_compile` + `node --check` del JS embebido).

### ✅ Hecho (2026-06-24): bug grave — PB/SB se comparaba contra "hoy", no contra la fecha de la competición
Riki sospechó que el caso de Pablo Rojo Castaño (ver arriba, el "empate" a 47.36) en realidad NO era un
empate: antes de esa carrera (Pamplona, 14/06/2026) su PB real era 47.68 (Córdoba, 26/04/2026), y en
Pamplona hizo 47.36 — una MEJORA real, no un empate. Confirmado con datos reales de `marcas_club.json`:
la competición que se analiza YA estaba en el export (47.36, 2026-06-14), así que `pb[key]` ("mejor de toda
la vida a día de hoy") YA INCLUÍA esa misma marca — compararla contra `pb[key]` es comparar la marca
contra sí misma, da empate SIEMPRE que la competición ya esté ingerida en la BD, aunque haya sido una
mejora real sobre el PB anterior a esa fecha.

**Fix en `cruce_local.py`**:
- `_fecha_iso(dmy)`: convierte la fecha de los scrapers (`DD/MM/YYYY`) al formato ISO de los exports
  (`YYYY-MM-DD`) para poder comparar fechas como cadenas ordenables.
- Nuevo índice `marcas_fecha` (`construir_indices()`, cacheado en `indice_nacional.pkl` junto al resto,
  con comprobación `"marcas_fecha" in data` para forzar reconstrucción de cachés antiguas): por cada
  atleta+prueba, lista de `(fecha_iso, valor)` de TODAS sus marcas — no solo el agregado pb/sb, que ya no
  basta para "deshacer" la inclusión de la marca actual.
- `_historial_antes_de(marcas_fecha, key, fecha_iso_actual, concurso, year=None)`: calcula el mejor valor
  de ese atleta+prueba ANT