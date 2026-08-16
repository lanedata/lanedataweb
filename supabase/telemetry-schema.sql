-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Telemetría: registro de errores + analíticas propias
--
-- Ejecuta este fichero ENTERO en Supabase (Dashboard > SQL Editor > New query).
-- Es idempotente: puedes volver a lanzarlo sin romper nada.
--
-- Diseño: la web es un sitio estático (GitHub Pages), así que no hay servidor
-- propio. El navegador escribe directamente en estas dos tablas con la clave
-- anon. Por eso:
--   · anon SOLO puede INSERT (nunca leer ni borrar).
--   · Los campos tienen límites de longitud para que nadie los use de vertedero.
--   · Los agregados del panel se calculan con funciones SECURITY DEFINER que
--     solo puede ejecutar un usuario autenticado (tú).
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. ERRORES
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Huella estable del error (mensaje + origen normalizados). Sirve para
  -- agrupar repeticiones del mismo fallo en el panel.
  fingerprint   TEXT NOT NULL CHECK (length(fingerprint) <= 64),

  severity      TEXT NOT NULL DEFAULT 'error'
                  CHECK (severity IN ('error', 'aviso', 'info')),
  -- De dónde vino: excepción global, promesa sin catch, error de React,
  -- recurso que no carga, fallo de Supabase o llamada manual.
  source        TEXT NOT NULL DEFAULT 'js'
                  CHECK (source IN ('js', 'promesa', 'react', 'recurso', 'supabase', 'manual')),

  message       TEXT NOT NULL CHECK (length(message) <= 2000),
  stack         TEXT CHECK (length(stack) <= 8000),
  -- Zona funcional de la web: 'lanelab', 'articulo', 'admin/dato'…
  area          TEXT CHECK (length(area) <= 120),
  -- Qué estaba haciendo el usuario cuando reventó (lo pone quien llama a logError)
  user_action   TEXT CHECK (length(user_action) <= 300),

  path          TEXT CHECK (length(path) <= 500),
  referrer      TEXT CHECK (length(referrer) <= 500),
  browser       TEXT CHECK (length(browser) <= 80),
  os            TEXT CHECK (length(os) <= 80),
  device        TEXT CHECK (length(device) <= 20),
  viewport      TEXT CHECK (length(viewport) <= 20),
  language      TEXT CHECK (length(language) <= 20),
  session_id    TEXT CHECK (length(session_id) <= 40),
  app_version   TEXT CHECK (length(app_version) <= 60),

  -- Contexto libre que añade quien registra el error (ids, parámetros…)
  context       JSONB,

  -- Gestión desde el panel (solo tú puedes tocar esto)
  status        TEXT NOT NULL DEFAULT 'nuevo'
                  CHECK (status IN ('nuevo', 'revisando', 'resuelto', 'ignorado')),
  notes         TEXT CHECK (length(notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS error_logs_created_idx     ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_fingerprint_idx ON error_logs (fingerprint);
CREATE INDEX IF NOT EXISTS error_logs_status_idx      ON error_logs (status) WHERE status = 'nuevo';

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_errors" ON error_logs;
CREATE POLICY "anon_insert_errors"
  ON error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_errors" ON error_logs;
CREATE POLICY "auth_read_errors"
  ON error_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_update_errors" ON error_logs;
CREATE POLICY "auth_update_errors"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_errors" ON error_logs;
CREATE POLICY "auth_delete_errors"
  ON error_logs FOR DELETE
  TO authenticated
  USING (true);


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. ANALÍTICAS
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Un evento por fila. `name` = 'page_view' para las visitas, 'page_time' para
-- el tiempo de lectura de una página, 'session_end' para el cierre de sesión
-- (trae la duración total), y el nombre de la funcionalidad para todo lo demás
-- ('lab_tool', 'buscar', 'compartir'…).
--
-- No se guarda ninguna IP, ni cookie, ni identificador persistente: session_id
-- es un aleatorio que vive en sessionStorage y muere al cerrar la pestaña.
-- El país se deduce de la zona horaria del navegador, no de la IP.

CREATE TABLE IF NOT EXISTS analytics_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  session_id     TEXT NOT NULL CHECK (length(session_id) <= 40),
  name           TEXT NOT NULL CHECK (length(name) <= 60),

  path           TEXT CHECK (length(path) <= 500),
  title          TEXT CHECK (length(title) <= 300),
  referrer_host  TEXT CHECK (length(referrer_host) <= 160),

  country        TEXT CHECK (length(country) <= 8),      -- ISO 3166-1 alfa-2
  timezone       TEXT CHECK (length(timezone) <= 60),
  language       TEXT CHECK (length(language) <= 20),

  device         TEXT CHECK (length(device) <= 20),      -- movil | tablet | escritorio
  os             TEXT CHECK (length(os) <= 40),
  browser        TEXT CHECK (length(browser) <= 40),
  screen         TEXT CHECK (length(screen) <= 20),

  -- Etiqueta legible del evento: qué calculadora, qué se buscó, qué se compartió
  label          TEXT CHECK (length(label) <= 200),
  -- Milisegundos: en 'page_time' es lo que se ha leído esa página,
  -- en 'session_end' es la duración total de la sesión.
  duration_ms    INTEGER CHECK (duration_ms >= 0 AND duration_ms <= 86400000),
  props          JSONB
);

CREATE INDEX IF NOT EXISTS analytics_created_idx  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_name_idx     ON analytics_events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_session_idx  ON analytics_events (session_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_analytics" ON analytics_events;
CREATE POLICY "anon_insert_analytics"
  ON analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_analytics" ON analytics_events;
CREATE POLICY "auth_read_analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_delete_analytics" ON analytics_events;
CREATE POLICY "auth_delete_analytics"
  ON analytics_events FOR DELETE
  TO authenticated
  USING (true);


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. AGREGADOS PARA EL PANEL
-- ═════════════════════════════════════════════════════════════════════════════
-- Se ejecutan en Postgres (rápido) en vez de descargar miles de filas al
-- navegador. SECURITY DEFINER + REVOKE: solo un usuario autenticado las llama.

-- 3.1 Resumen general del periodo
CREATE OR REPLACE FUNCTION analytics_overview(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  views          BIGINT,
  sessions       BIGINT,
  countries      BIGINT,
  avg_seconds    NUMERIC,
  bounce_rate    NUMERIC,
  feature_events BIGINT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  WITH win AS (
    SELECT * FROM analytics_events
    WHERE created_at >= p_from AND created_at < p_to
  ),
  per_session AS (
    SELECT session_id, count(*) FILTER (WHERE name = 'page_view') AS pv
    FROM win GROUP BY session_id
  )
  SELECT
    (SELECT count(*) FROM win WHERE name = 'page_view'),
    (SELECT count(DISTINCT session_id) FROM win),
    (SELECT count(DISTINCT country) FROM win WHERE country IS NOT NULL),
    (SELECT round(avg(duration_ms) / 1000.0, 1) FROM win
       WHERE name = 'session_end' AND duration_ms IS NOT NULL),
    (SELECT CASE WHEN count(*) = 0 THEN 0
            ELSE round(100.0 * count(*) FILTER (WHERE pv <= 1) / count(*), 1) END
     FROM per_session),
    (SELECT count(*) FROM win WHERE name NOT IN ('page_view', 'page_time', 'session_end'));
$fn$;

-- 3.2 Serie diaria
CREATE OR REPLACE FUNCTION analytics_by_day(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (day DATE, views BIGINT, sessions BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    d::date AS day,
    coalesce(v.views, 0)::bigint,
    coalesce(v.sessions, 0)::bigint
  FROM generate_series(p_from::date, (p_to - interval '1 second')::date, '1 day') AS d
  LEFT JOIN (
    SELECT
      (created_at AT TIME ZONE 'Europe/Madrid')::date AS day,
      count(*) FILTER (WHERE name = 'page_view') AS views,
      count(DISTINCT session_id) AS sessions
    FROM analytics_events
    WHERE created_at >= p_from AND created_at < p_to
    GROUP BY 1
  ) v ON v.day = d::date
  ORDER BY 1;
$fn$;

-- 3.3 Ranking por dimensión: 'path' | 'country' | 'device' | 'browser' | 'os'
--     | 'referrer_host' | 'language' | 'timezone'
CREATE OR REPLACE FUNCTION analytics_dimension(
  p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_dim TEXT, p_limit INT DEFAULT 20
)
RETURNS TABLE (label TEXT, views BIGINT, sessions BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_dim NOT IN ('path','country','device','browser','os','referrer_host','language','timezone') THEN
    RAISE EXCEPTION 'Dimensión no permitida: %', p_dim;
  END IF;

  RETURN QUERY EXECUTE format($f$
    SELECT
      coalesce(nullif(%I, ''), '(desconocido)')::text,
      count(*) FILTER (WHERE name = 'page_view')::bigint,
      count(DISTINCT session_id)::bigint
    FROM analytics_events
    WHERE created_at >= $1 AND created_at < $2
    GROUP BY 1
    ORDER BY 2 DESC, 3 DESC
    LIMIT $3
  $f$, p_dim) USING p_from, p_to, p_limit;
END;
$fn$;

-- 3.4 Funcionalidades que usa la gente
CREATE OR REPLACE FUNCTION analytics_features(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (name TEXT, label TEXT, uses BIGINT, sessions BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    e.name::text,
    coalesce(nullif(e.label, ''), '—')::text,
    count(*)::bigint,
    count(DISTINCT e.session_id)::bigint
  FROM analytics_events e
  WHERE e.created_at >= p_from AND e.created_at < p_to
    AND e.name NOT IN ('page_view', 'page_time', 'session_end')
  GROUP BY 1, 2
  ORDER BY 3 DESC
  LIMIT 100;
$fn$;

-- 3.5 Reparto por hora del día (hora peninsular)
CREATE OR REPLACE FUNCTION analytics_by_hour(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (hour INT, views BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    h::int,
    coalesce(v.views, 0)::bigint
  FROM generate_series(0, 23) AS h
  LEFT JOIN (
    SELECT
      extract(hour FROM created_at AT TIME ZONE 'Europe/Madrid')::int AS hour,
      count(*) AS views
    FROM analytics_events
    WHERE created_at >= p_from AND created_at < p_to AND name = 'page_view'
    GROUP BY 1
  ) v ON v.hour = h
  ORDER BY 1;
$fn$;

-- 3.6 Páginas más vistas, con el tiempo medio que se pasa en cada una
CREATE OR REPLACE FUNCTION analytics_pages(
  p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_limit INT DEFAULT 25
)
RETURNS TABLE (path TEXT, views BIGINT, sessions BIGINT, avg_seconds NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT
    coalesce(nullif(e.path, ''), '(desconocida)')::text,
    count(*) FILTER (WHERE e.name = 'page_view')::bigint,
    count(DISTINCT e.session_id)::bigint,
    round(avg(e.duration_ms) FILTER (WHERE e.name = 'page_time') / 1000.0, 1)
  FROM analytics_events e
  WHERE e.created_at >= p_from AND e.created_at < p_to
    AND e.name IN ('page_view', 'page_time')
  GROUP BY 1
  ORDER BY 2 DESC, 3 DESC
  LIMIT p_limit;
$fn$;

REVOKE ALL ON FUNCTION analytics_overview(TIMESTAMPTZ, TIMESTAMPTZ)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION analytics_by_day(TIMESTAMPTZ, TIMESTAMPTZ)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION analytics_by_hour(TIMESTAMPTZ, TIMESTAMPTZ)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION analytics_dimension(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION analytics_features(TIMESTAMPTZ, TIMESTAMPTZ)             FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION analytics_overview(TIMESTAMPTZ, TIMESTAMPTZ)             TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_by_day(TIMESTAMPTZ, TIMESTAMPTZ)               TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_by_hour(TIMESTAMPTZ, TIMESTAMPTZ)              TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_dimension(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_features(TIMESTAMPTZ, TIMESTAMPTZ)             TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_pages(TIMESTAMPTZ, TIMESTAMPTZ, INT)           TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. LIMPIEZA / RETENCIÓN
-- ═════════════════════════════════════════════════════════════════════════════
-- La política de privacidad promete 14 meses de analíticas y 90 días de errores.
-- Ejecuta esto de vez en cuando (o prográmalo con pg_cron si lo activas).

CREATE OR REPLACE FUNCTION telemetry_purge()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  n_events INT;
  n_errors INT;
BEGIN
  DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '14 months';
  GET DIAGNOSTICS n_events = ROW_COUNT;
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS n_errors = ROW_COUNT;
  RETURN format('Borrados %s eventos y %s errores', n_events, n_errors);
END;
$fn$;

REVOKE ALL ON FUNCTION telemetry_purge() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION telemetry_purge() TO authenticated;

-- Con pg_cron activado (Database > Extensions), para que se limpie solo:
--   SELECT cron.schedule('telemetry-purge', '0 4 * * 0', 'SELECT telemetry_purge()');
