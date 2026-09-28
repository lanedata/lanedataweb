-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Últimos fichajes (directo temporal de /test)
--
-- Ejecuta este fichero ENTERO en Supabase (Dashboard > SQL Editor > New query).
-- Es idempotente: puedes volver a lanzarlo sin romper nada.
--
-- DESPUÉS, la clave de colaborador se pone desde el panel: /admin/fichajes.
-- La escribes ahí, se guarda hasheada y ya se la pasas a quien colabore.
-- (Desde el SQL Editor también vale: SELECT fichajes_set_clave('...');)
--
-- Diseño: la web es un sitio estático (GitHub Pages), así que no hay servidor
-- propio donde comprobar la contraseña. Por eso:
--   · anon SOLO puede LEER los fichajes visibles. No puede insertar directamente.
--   · Los envíos entran por la función `fichajes_enviar`, SECURITY DEFINER, que
--     comprueba la clave contra un hash bcrypt guardado en `fichajes_clave`.
--     La clave NUNCA viaja al bundle de JavaScript: el navegador manda lo que
--     escribe el colaborador y es Postgres quien lo valida.
--   · `fichajes_clave` no tiene ninguna política RLS, así que ni anon ni un
--     usuario autenticado pueden leer el hash por la API.
--   · Los envíos se publican EN EL MOMENTO (decisión del proyecto: sin cola de
--     revisión). Para compensarlo hay límite de ritmo, antiduplicados y la
--     columna `visible`, que te deja ocultar algo sin borrarlo.
-- ─────────────────────────────────────────────────────────────────────────────

-- bcrypt (crypt/gen_salt). En Supabase suele venir ya instalada en el esquema
-- `extensions`; si no está, esta línea la instala. Las funciones de abajo llevan
-- `search_path = public, extensions` para encontrarla en cualquiera de los dos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. FICHAJES
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fichajes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Hora a la que se informó del fichaje: es la que se pinta en el directo.
  -- Por defecto, el momento del envío; el colaborador puede corregirla si se
  -- enteró antes.
  informado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Nombre y apellidos del atleta.
  atleta        TEXT NOT NULL CHECK (length(btrim(atleta)) BETWEEN 3 AND 120),

  -- Clubes. NULL = incógnita: se sabe que se mueve pero no de dónde / a dónde.
  -- La restricción de abajo exige conocer al menos uno de los dos.
  club_origen   TEXT CHECK (club_origen IS NULL OR length(btrim(club_origen)) BETWEEN 2 AND 120),
  club_destino  TEXT CHECK (club_destino IS NULL OR length(btrim(club_destino)) BETWEEN 2 AND 120),
  CONSTRAINT fichajes_algun_club CHECK (club_origen IS NOT NULL OR club_destino IS NOT NULL),

  -- División en la que compite el club ('División de Honor', 'Primera'…).
  division      TEXT CHECK (division IS NULL OR length(btrim(division)) <= 80),

  -- De dónde sale la información (medio, comunicado, el propio club…).
  fuente        TEXT CHECK (fuente IS NULL OR length(fuente) <= 200),
  nota          TEXT CHECK (nota IS NULL OR length(nota) <= 400),
  -- Alias de quien lo manda, para saber de quién viene cada aviso.
  enviado_por   TEXT CHECK (enviado_por IS NULL OR length(enviado_por) <= 80),

  -- Interruptor para retirar algo del directo sin perder el registro.
  visible       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS fichajes_informado_idx ON fichajes (informado_en DESC);
CREATE INDEX IF NOT EXISTS fichajes_creado_idx    ON fichajes (creado_en DESC);

ALTER TABLE fichajes ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede LEER los visibles (es un directo público dentro de /test).
DROP POLICY IF EXISTS "public_read_fichajes" ON fichajes;
CREATE POLICY "public_read_fichajes"
  ON fichajes FOR SELECT
  TO anon, authenticated
  USING (visible = TRUE);

-- Tú (sesión autenticada) lo ves y lo gestionas todo.
DROP POLICY IF EXISTS "auth_full_fichajes" ON fichajes;
CREATE POLICY "auth_full_fichajes"
  ON fichajes FOR ALL
  TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

-- OJO: no hay política de INSERT para anon. Los envíos entran solo por
-- `fichajes_enviar`, que al ser SECURITY DEFINER se salta RLS.


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. CLAVE DE COLABORADOR
-- ═════════════════════════════════════════════════════════════════════════════
-- Una sola fila con el hash bcrypt. Sin políticas RLS = invisible por la API.

CREATE TABLE IF NOT EXISTS fichajes_clave (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hash           TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fichajes_clave ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fichajes_clave FROM anon, authenticated;

-- Fija o cambia la clave. Solo desde el SQL Editor o una sesión autenticada.
CREATE OR REPLACE FUNCTION fichajes_set_clave(p_clave TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
BEGIN
  IF p_clave IS NULL OR length(p_clave) < 6 THEN
    RAISE EXCEPTION 'La clave debe tener al menos 6 caracteres';
  END IF;
  INSERT INTO fichajes_clave (id, hash, actualizado_en)
  VALUES (1, crypt(p_clave, gen_salt('bf', 10)), NOW())
  ON CONFLICT (id) DO UPDATE
    SET hash = EXCLUDED.hash, actualizado_en = NOW();
  RETURN 'Clave de colaborador actualizada';
END;
$fn$;

-- La llama /admin/fichajes con tu sesión de administrador; anon nunca.
REVOKE ALL ON FUNCTION fichajes_set_clave(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_set_clave(TEXT) TO authenticated;


-- Saber si hay clave puesta y de cuándo es, SIN devolver nunca el hash.
-- Lo usa el panel para decirte si falta configurarla.
CREATE OR REPLACE FUNCTION fichajes_clave_estado()
RETURNS TABLE (configurada BOOLEAN, actualizado_en TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM fichajes_clave WHERE id = 1),
         (SELECT c.actualizado_en FROM fichajes_clave c WHERE c.id = 1);
$fn$;

REVOKE ALL ON FUNCTION fichajes_clave_estado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_clave_estado() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. ENVÍO DE UN FICHAJE (lo que llama /fichajes/enviar)
-- ═════════════════════════════════════════════════════════════════════════════
-- Comprueba la clave contra el hash y publica. Como se publica al momento, aquí
-- están los frenos: ritmo global, antiduplicados y validación de longitudes.

CREATE OR REPLACE FUNCTION fichajes_enviar(
  p_clave        TEXT,
  p_atleta       TEXT,
  p_club_origen  TEXT        DEFAULT NULL,
  p_club_destino TEXT        DEFAULT NULL,
  p_division     TEXT        DEFAULT NULL,
  p_informado_en TIMESTAMPTZ DEFAULT NULL,
  p_fuente       TEXT        DEFAULT NULL,
  p_nota         TEXT        DEFAULT NULL,
  p_enviado_por  TEXT        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
DECLARE
  v_hash      TEXT;
  v_id        UUID;
  v_recientes INT;
  v_atleta    TEXT := btrim(COALESCE(p_atleta, ''));
  v_origen    TEXT := NULLIF(btrim(COALESCE(p_club_origen, '')), '');
  v_destino   TEXT := NULLIF(btrim(COALESCE(p_club_destino, '')), '');
  v_division  TEXT := NULLIF(btrim(COALESCE(p_division, '')), '');
  v_momento   TIMESTAMPTZ := COALESCE(p_informado_en, NOW());
BEGIN
  -- ── Clave ──
  SELECT hash INTO v_hash FROM fichajes_clave WHERE id = 1;
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'La clave de colaborador no está configurada todavía';
  END IF;
  IF crypt(COALESCE(p_clave, ''), v_hash) <> v_hash THEN
    -- Freno al probado de claves por fuerza bruta (bcrypt ya cuesta ~100 ms).
    PERFORM pg_sleep(0.4);
    RAISE EXCEPTION 'Clave incorrecta';
  END IF;

  -- ── Validación ──
  IF length(v_atleta) < 3 THEN
    RAISE EXCEPTION 'Falta el nombre y los apellidos del atleta';
  END IF;
  IF v_origen IS NULL AND v_destino IS NULL THEN
    RAISE EXCEPTION 'Indica al menos el club de origen o el de destino';
  END IF;
  -- Una hora informada en el futuro descoloca el orden del directo.
  IF v_momento > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'La hora informada no puede estar en el futuro';
  END IF;
  IF v_momento < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'La hora informada es demasiado antigua para el directo';
  END IF;

  -- ── Límite de ritmo global ──
  SELECT COUNT(*) INTO v_recientes
    FROM fichajes WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_recientes >= 40 THEN
    RAISE EXCEPTION 'Demasiados envíos en la última hora; prueba más tarde';
  END IF;

  -- ── Antiduplicados: mismo atleta y mismo destino en la última hora ──
  IF EXISTS (
    SELECT 1 FROM fichajes
     WHERE lower(atleta) = lower(v_atleta)
       AND COALESCE(lower(club_destino), '') = COALESCE(lower(v_destino), '')
       AND creado_en > NOW() - INTERVAL '1 hour'
  ) THEN
    RAISE EXCEPTION 'Ese fichaje ya se ha publicado hace unos minutos';
  END IF;

  INSERT INTO fichajes (
    informado_en, atleta, club_origen, club_destino, division,
    fuente, nota, enviado_por
  ) VALUES (
    v_momento, v_atleta, v_origen, v_destino, v_division,
    NULLIF(btrim(COALESCE(p_fuente, '')), ''),
    NULLIF(btrim(COALESCE(p_nota, '')), ''),
    NULLIF(btrim(COALESCE(p_enviado_por, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- Esta sí la puede llamar el navegador: la clave la valida Postgres.
GRANT EXECUTE ON FUNCTION fichajes_enviar(
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT
) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. LIMPIEZA (la sección es temporal)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cuando el mercado se cierre y quites la sección de /test, para borrarlo todo:
--     DROP FUNCTION IF EXISTS fichajes_enviar(TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS fichajes_set_clave(TEXT);
--     DROP FUNCTION IF EXISTS fichajes_clave_estado();
--     DROP TABLE IF EXISTS fichajes_clave;
--     DROP TABLE IF EXISTS fichajes;
