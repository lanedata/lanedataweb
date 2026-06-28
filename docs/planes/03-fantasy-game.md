# Plan de ingeniería: Fantasy Game de Atletismo
### Repo: `fantasy-game` (nuevo) · App dinámica · Comparte el Supabase del motor

> Contexto en `00-ecosistema.md`. Este plan **arranca el último**: depende de que el motor
> (`fantasy-atletismo-engine`) sirva datos estables, sobre todo **resultados** (su hito de riesgo).
> No scrapea nada: **lee** del motor y **escribe** estado de juego.
>
> **Decisión de topología (cerrada):** repo propio, app dinámica, **comparte el proyecto Supabase
> del motor** en un esquema `game` separado. Lee `engine.*` en read-only; escribe en `game.*`.
> Esto aísla runtime y seguridad del motor (batch/cron) sin introducir un contrato de datos entre
> repos: el juego consulta las tablas del motor directamente.

> **Nota de madurez:** el juego aún no tiene especificación funcional detallada (reglas de
> puntuación, formato de ligas, etc.). Este plan fija arquitectura, esquema y los hitos; las reglas
> concretas se cierran en M1 con el responsable antes de implementar puntuación.

## 0. Contexto y restricciones

### 0.1 Qué se construye
Una aplicación web donde los usuarios:
- Crean/gestionan **ligas** privadas (un admin por liga).
- Componen **plantillas** de atletas (según las reglas que se definan: presupuesto, posiciones,
  límites por club/prueba…).
- Reciben **puntos** automáticamente según los **resultados reales** que el motor ingiere cada finde.
- Ven **clasificaciones** de su liga.

El sistema de datos (quién compitió, qué marca, qué puesto, DNS/DNF) **no se calcula aquí**: viene
del motor. El juego solo aplica **reglas de puntuación** sobre esos hechos.

### 0.2 Restricciones duras
- **Coste 0 €/mes:** Supabase Free (compartido con el motor) + hosting de app en free tier
  (Vercel/Netlify/Cloudflare Pages con funciones). Auth de Supabase (gratis).
- **El motor es read-only para el juego.** El juego nunca escribe en `engine.*`. Si necesita un
  dato que el motor no expone, se pide al motor (no se duplica el scraping).
- **Idempotencia de la puntuación:** recalcular los puntos de una jornada dos veces da el mismo
  resultado. La puntuación es una **proyección determinista** de `engine.resultados` + reglas.
- **Secretos en variables de entorno del host**, nunca en el código.

### 0.3 Decisiones de arquitectura
- **Stack:** Next.js (App Router) + TypeScript, mismo ecosistema que `lanedataweb` para reaprovechar
  conocimiento, componentes y branding. Hosting dinámico (Vercel free) — a diferencia de la web
  editorial, **este sí necesita servidor** (auth de usuarios, estado de ligas, recálculo de puntos).
- **DB:** Supabase del motor, esquema `game`. Acceso a `engine.*` mediante vistas o `GRANT SELECT`
  read-only. RLS estricta en `game.*` (cada usuario solo ve/edita lo suyo y sus ligas).
- **Auth:** Supabase Auth (email/OAuth). Reutilizar el patrón de `lanedataweb` (middleware + RLS).
- **Validación:** zod/TypeScript en los bordes (igual filosofía que pydantic en el motor).

### 0.4 Trampas globales
1. **No duplicar la verdad de los datos.** Marcas, puestos y estados son del motor. El juego guarda
   *referencias* (`atleta_id`, `prueba_id`, `competicion_id` del motor), no copias de las marcas.
2. **La puntuación se recalcula desde cero, no se acumula incrementalmente.** Si se acumula, un
   reproceso del motor (PDF que corrige al live) desincroniza. Recalcular = `resultados × reglas`.
3. **El motor publica resultados en dos fases** (`es_definitivo=false` live, `true` PDF oficial). El
   juego debe distinguir **puntos provisionales vs definitivos** y recalcular cuando llega el oficial.
4. **RLS desde el día 1.** Un usuario no puede leer las plantillas de otra liga ni alterar puntos.
5. **Selección de atletas restringida al universo real.** Un usuario solo puede fichar atletas que
   existen en `engine.atletas` (evitar nombres libres).

## M0 — Esqueleto, auth y conexión al motor
**Objetivo:** app Next.js que arranca, con login Supabase y lectura de `engine.*` funcionando.

- Repo nuevo. Next.js + TS + Tailwind (replicar config de `lanedataweb`). `.env.example` con
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
- Cliente Supabase (browser + server), middleware de auth (patrón de `lanedataweb`).
- **Acceso read-only a `engine.*`:** crear en Supabase vistas en el esquema `game` (o `public`) que
  expongan lo necesario (`v_atletas`, `v_competiciones`, `v_resultados`) con `GRANT SELECT`. El
  juego nunca toca las tablas del motor directamente.
- **Criterio:** un usuario hace login; una página de prueba lista competiciones reales leídas del
  motor.

## M1 — Reglas de juego (especificación, con el responsable)
**Objetivo:** documento `REGLAS.md` que fija, sin ambigüedad, cómo se juega. **Hito de producto, no
de código.** Decidir y documentar:
- Formato de liga (nº de participantes, jornadas = findes, duración temporada).
- Composición de plantilla: ¿presupuesto?, ¿nº de atletas?, ¿por sexo/prueba/club?, ¿capitán?
- **Sistema de puntuación:** puntos por puesto, por marca/récord, por mínimas, penalización por
  DNS/DNF/DQ, bonus… (esto define el motor de cálculo de M4).
- Mercado/fichajes: ¿se cambian atletas entre jornadas?, ¿cuándo se cierra la plantilla?
- Manejo de casos raros: atleta que no compite, prueba cancelada, resultado que llega tarde.
- **Criterio:** `REGLAS.md` aprobado por el responsable. Sin esto no se implementa M4.

## M2 — Esquema de datos del juego (`game`)
**Objetivo:** esquema PostgreSQL del juego con RLS, en migraciones versionadas.

Tablas mínimas (ajustar a `REGLAS.md`):
```sql
-- usuarios: gestionados por Supabase Auth (auth.users). game.perfiles los extiende.
create table game.perfiles (
  user_id uuid primary key references auth.users(id),
  alias text not null,
  created_at timestamptz default now()
);

create table game.ligas (
  id bigint generated always as identity primary key,
  nombre text not null,
  admin_id uuid references auth.users(id),
  codigo_invitacion text unique,
  temporada text not null,
  reglas jsonb not null,            -- snapshot de las reglas de esta liga (versionadas)
  created_at timestamptz default now()
);

create table game.miembros_liga (
  liga_id bigint references game.ligas(id) on delete cascade,
  user_id uuid references auth.users(id),
  primary key (liga_id, user_id)
);

create table game.plantillas (
  id bigint generated always as identity primary key,
  liga_id bigint references game.ligas(id) on delete cascade,
  user_id uuid references auth.users(id),
  jornada text not null,            -- identificador de finde/jornada
  unique (liga_id, user_id, jornada)
);

create table game.plantilla_atletas (
  plantilla_id bigint references game.plantillas(id) on delete cascade,
  atleta_id bigint not null,        -- referencia a engine.atletas.id (read-only)
  rol text,                         -- 'titular' | 'capitan' | … según reglas
  primary key (plantilla_id, atleta_id)
);

-- Puntos: PROYECCIÓN determinista de engine.resultados + reglas. Recalculable.
create table game.puntos_jornada (
  liga_id bigint references game.ligas(id) on delete cascade,
  user_id uuid references auth.users(id),
  jornada text not null,
  puntos integer not null,
  es_definitivo boolean not null default false,  -- sigue al es_definitivo del motor
  detalle jsonb,                    -- desglose por atleta para auditar
  updated_at timestamptz default now(),
  primary key (liga_id, user_id, jornada)
);
```
- **RLS:** un usuario solo lee ligas a las que pertenece y solo edita su propia plantilla; solo el
  admin edita su liga. Los `puntos_jornada` son de solo-lectura para los usuarios (los escribe el
  recálculo del servidor con service key).
- **Criterio:** migraciones aplicadas; tests de RLS (un usuario no puede leer datos de otra liga).

## M3 — Gestión de ligas y plantillas (UI + API)
**Objetivo:** los usuarios crean ligas, invitan, y componen plantillas válidas.
- Crear liga (genera `codigo_invitacion`), unirse por código, listar miembros.
- Buscador de atletas leyendo `engine.atletas` (con filtros por prueba/club si las reglas lo piden).
- Validación de plantilla **según `reglas` de la liga** (presupuesto, límites) en servidor, no solo
  en cliente. Cierre de plantilla por jornada (deadline = inicio del finde, en `Europe/Madrid`).
- **Criterio:** un usuario compone una plantilla válida y el sistema rechaza una inválida (tests).

## M4 — Motor de puntuación (el núcleo del juego)
**Objetivo:** calcular `game.puntos_jornada` como proyección determinista de
`engine.resultados` + `game.ligas.reglas`.
- Función `calcular_puntos(liga_id, jornada)`: para cada usuario, suma los puntos de sus
  `plantilla_atletas` según los resultados reales de esa jornada y las reglas de la liga.
- **Recalcula desde cero** (no acumula). Idempotente: misma entrada → mismos puntos.
- Distingue **provisional** (`es_definitivo=false`, datos live) de **definitivo** (PDF oficial).
  Cuando el motor marca un resultado definitivo, se recalcula y se fija.
- Disparo: un workflow/cron (o webhook del motor) tras los jobs de resultados del motor. También
  `workflow_dispatch`/endpoint manual para recálculo de rescate.
- **Criterio:** sobre datos de prueba con casos reales (DNS, resultado que pasa de live a oficial,
  ex aequo), los puntos coinciden con un cálculo a mano (`REGLAS.md`); recalcular dos veces no
  cambia nada.

## M5 — Clasificaciones y experiencia
**Objetivo:** que jugar sea agradable.
- Clasificación de liga por jornada y acumulada; desglose por atleta (de `detalle`).
- Estados visibles: "puntos provisionales / definitivos" según el motor.
- Notificaciones opcionales (email Resend free) al cerrar una jornada.
- **Criterio:** un usuario ve su posición, su desglose y si los puntos son provisionales.

## M6 — Operación y endurecimiento
- **Sincronía con el motor:** definir cómo se entera el juego de que hay resultados nuevos
  (webhook del motor, cron que mira `engine.runs`/`engine.competiciones.estado`, o polling ligero).
- **Sin estado perdido:** todo el estado de juego en Supabase.
- **Auditoría:** `detalle` jsonb por jornada para explicar cada punto.
- **Coste:** vigilar límites de Supabase Free (filas, ancho de banda) y del host.
- **Casos límite documentados:** atleta que cambia de club, resultado retirado tras una sanción,
  jornada sin competiciones.

## Apéndice — Orden y dependencias
```
(motor sirviendo resultados estables)
        │
M0 ──► M1(producto) ──► M2 ──► M3 ──► M4 ──► M5 ──► M6
```
- **M1 (reglas) es bloqueante** para M4: no se implementa puntuación sin reglas cerradas.
- **M4 depende de la calidad de `engine.resultados`**: si el motor no da resultados fiables, el
  juego no puede puntuar. Por eso el juego va el último del ecosistema.

## Decisiones diferidas (cerrar antes de cada hito)
- ¿Esquema `game` en el Supabase del motor o proyecto Supabase propio? Recomendado: **mismo proyecto,
  esquema `game`** (evita contrato de datos entre repos). Reconsiderar solo si los límites del free
  tier aprietan.
- Reglas de puntuación concretas → `REGLAS.md` (M1).
- Mecanismo exacto de disparo del recálculo (webhook vs cron) → M6, según lo que exponga el motor.
