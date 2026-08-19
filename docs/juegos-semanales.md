# Juegos semanales: test y wordle

Dos juegos de atletismo con una tanda por semana, cada uno en su CSV en la raíz
del repo, igual que `dato-semana.csv`:

| Fichero | Qué es | Tamaño |
|---|---|---|
| `test-semanal.csv` | Test de 8 preguntas × 3 niveles × 26 semanas (624) | ~190 KB |
| `wordle-semanal.csv` | Una palabra de atletismo por semana, 53 semanas | ~10 KB |

Ojo: el original editable vive en la raíz, pero **la web sólo puede leer lo que
está en `public/`**. El sitio se publica como export estático, así que un CSV en
la raíz del repo no se sirve. Por eso hay una copia de los dos en `public/`, como
ya pasa con `dato-semana.csv`. Al regenerar hay que copiarla:

```bash
cp test-semanal.csv wordle-semanal.csv public/
```

Si se olvida, la web sigue mostrando la tanda anterior sin quejarse (es
exactamente lo que le ha pasado a `dato-semana.csv`: la copia de `public/` y la
de la raíz llevan tiempo desincronizadas).

Ambos van con separador `;` y UTF-8 **con BOM**, como `dato-semana.csv`: así
Excel en español los abre bien de doble clic. La primera semana empieza el lunes
**24/08/2026** y cada fila lleva su `fecha_lunes` calculada.

## De dónde salen las respuestas

Esta es la parte que importa: **el test no está escrito de memoria**. Salvo el
bloque de reglamento y material (unas 70 preguntas redactadas a mano en
`scripts/gen_test_semanal.py`), todo se genera desde los datos de la web
atletismo-espana. Eso tiene dos consecuencias buenas:

- La respuesta correcta es **verificable**: sale del mismo dato que publica la web.
- Los distractores son **reales**. Cuando la pregunta es «¿cuál es el récord de
  España de 100 m?», las tres opciones falsas son marcas del top-10 histórico
  español de esa prueba, no números inventados. Engañan de verdad.

| Fuente | Dónde vive | Qué preguntas alimenta |
|---|---|---|
| Récords de España (pista, ruta y marcha) | `manager-atletismo`, en git | plusmarquistas, marcas, años y sedes |
| Rankings all-time RFEA | `manager-atletismo/datos/alltime/`, en git | 2.º de todos los tiempos, distractores creíbles |
| Historial de Campeonatos de España (515 ediciones desde 1917) | `manager-atletismo`, en git | sedes de cada edición |
| Ranking europeo (European Athletics) | `manager-atletismo`, en git | mejor español por prueba y su puesto europeo |
| Mínimas del Europeo absoluto 2026 | CDN de atletismo-espana | mínimas RFEA por prueba |
| Agregados de clubes y sedes | CDN de atletismo-espana | comparativas de volumen de la base de datos |
| Reglamento de World Athletics / RFEA | a mano, en el script | vallas, pesos, medidas, siglas, categorías |

## Regenerar

```bash
python scripts/gen_test_semanal.py
```

```bash
python scripts/gen_wordle_semanal.py
```

El test necesita el repo `manager-atletismo` clonado **al lado de este**
(`../manager-atletismo`); si lo tienes en otro sitio, `export
MANAGER_ATLETISMO=/ruta/al/repo`. Los tres agregados que no están en git se
bajan del CDN la primera vez y se quedan en `.cache-datos/` (gitignorado); para
forzar datos frescos, borra esa carpeta.

La descarga usa `curl --compressed` a propósito: sin pedir gzip, Firebase sirve
esos JSON en crudo y son ~12 MB en vez de ~1,2 MB, y el egress se factura. La
caché solo guarda lo que parsea como JSON válido, así que una descarga cortada
no puede envenenarla.

El reparto es determinista (`SEED` en el script): con los mismos datos de
entrada, el CSV sale idéntico. Para una tanda nueva tras una carga semanal,
cambia `SEED` o sube `SEMANAS`.

## En la web: LaneGames

Los dos juegos se pintan con `<LaneGames />`
(`components/lanegames/LaneGames.tsx`), que descarga los dos CSV en cliente y
abre la semana en curso: la última cuyo `fecha_lunes` ya ha pasado. Antes de la
primera semana enseña la primera; agotada la tanda, se queda en la última en vez
de dejar el hueco vacío.

De momento **sólo está montado en `/test`**, el sandbox con contraseña, y no
aparece en el menú. Para sacarlo a producción basta con montarlo donde toque
(por ejemplo en la home, junto al dato de la semana) y quitarle la prop
`navegable`, que es la que enseña las flechas para saltar de semana: eso está
para poder revisar tandas futuras antes de publicarlas, no para el visitante.

| Pieza | Qué hace |
|---|---|
| `lib/lanegames/types.ts` | El modelo: niveles del test, pregunta, palabra |
| `lib/lanegames/csv.ts` | Parseo de los dos CSV, semana activa y corrección del wordle |
| `lib/lanegames/store.ts` | Guarda la partida en `localStorage`, una clave por juego y semana |
| `components/lanegames/QuizSemanal.tsx` | El test, con el selector de nivel |
| `components/lanegames/WordleSemanal.tsx` | El tablero, el teclado y las pistas |
| `lib/csv.ts` | Lector de CSV compartido con el dato de la semana |

Detalles que conviene saber:

- **La partida se guarda en el navegador.** Recargar a mitad del test no pierde
  lo respondido, y cada nivel guarda la suya por separado. No sale nada del
  dispositivo: no hay backend, no hay ranking.
- **El wordle no tiene diccionario.** Vale cualquier combinación de letras de la
  longitud correcta; validar contra un listado español exigiría embarcar el
  diccionario entero y no compensa. Lo que sí se comprueba es que no repitas un
  intento ya hecho.
- **Se teclea con el teclado físico o con el de pantalla.** Lo que se escribe se
  normaliza a mayúsculas sin tildes ni Ñ, que es como están las soluciones, así
  que teclear «é» cuenta como E.
- **Las pistas se abren solas**: la primera de entrada, la segunda al segundo
  intento y la tercera al cuarto. También hay un botón para adelantarlas, y al
  acabar la partida se enseñan las tres.
- **Las opciones del test no se rebarajan** en la web: el orden es el del CSV,
  que ya viene barajado del generador. Así el `id` de cada pregunta sigue
  apuntando a lo mismo y la partida guardada se puede recuperar.

Lo que todavía no tiene, por si se saca a la web pública: no manda ningún evento
a las analíticas (habría que añadir los suyos a `EVENTS` en
`lib/telemetry/analytics.ts`) y no hay forma de compartir el resultado.

## Columnas

### `test-semanal.csv`

| Columna | Contenido |
|---|---|
| `semana`, `fecha_lunes` | número de semana (1…26) y lunes en que arranca |
| `nivel` | `facil`, `intermedio` o `dificil` |
| `n`, `id` | orden dentro del bloque y un id estable tipo `S07-DIF-3` |
| `tema` | para agrupar o filtrar (Récords de España, Campeonatos, Ranking europeo…) |
| `pregunta`, `opcion_a`…`opcion_d` | enunciado y las cuatro opciones, ya barajadas |
| `correcta` | letra `A`–`D` |
| `respuesta` | el texto de la opción correcta (redundante, pero cómodo) |
| `explicacion` | la frase que se enseña al responder, con marca, sede y fecha |
| `fuente` | de qué dato sale, para poder auditarla |

Qué cae en cada nivel:

- **fácil** — reglamento y material, plusmarquistas absolutos de las pruebas
  conocidas, comparativas de clubes y sedes.
- **intermedio** — año del récord, sedes de Campeonatos de España recientes,
  mejor español del ranking europeo, reglas más finas.
- **difícil** — marca exacta del récord, 2.º de todos los tiempos, sedes de
  ediciones antiguas, puestos europeos concretos, mínimas del Europeo.

### `wordle-semanal.csv`

| Columna | Contenido |
|---|---|
| `semana`, `fecha_lunes` | una palabra por semana |
| `solucion` | en mayúsculas, **sin tildes ni Ñ**, de 4 a 10 letras |
| `longitud`, `letras_distintas` | para dimensionar el tablero y estimar dificultad |
| `dificultad`, `categoria` | `facil`/`media`/`dificil`; categoría temática |
| `intentos` | 6, como el wordle clásico |
| `pista_1`, `pista_2`, `pista_3` | de vaga a casi evidente, para ir soltándolas |
| `explicacion` | se enseña al resolver; aquí sí puede nombrar la palabra |

El generador comprueba al vuelo que la solución **no se cuela en ninguna de las
tres pistas** y que no hay palabras repetidas. Todo el contenido está en la
lista `P` del script: editar el juego es editar esa lista.

## Lo que caduca

- **Los puestos del ranking europeo son la foto del 04/08/2026.** En
  `manager-atletismo` esa fuente va congelada en el repo y se refresca a mano,
  así que esas preguntas envejecen: al actualizarla, regenera.
- **Las comparativas de clubes y sedes** dependen de agregados que cambian con
  cada carga semanal. Los números de la explicación son los del día que
  generaste.
- **Los récords** cambian poco, pero cambian. La columna `fuente` lleva la fecha
  de cierre de los datos usados.
