-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Mercado de fichajes  (v2)
--
-- Ejecuta este fichero ENTERO en Supabase (Dashboard > SQL Editor > New query).
-- Es idempotente: puedes volver a lanzarlo sin romper nada. Si ya tenías la v1
-- aplicada, al relanzarlo se ACTUALIZA en sitio sin perder datos ni la clave.
--
-- La clave de colaborador se pone desde el panel: /admin/fichajes.
--
-- Tres vías de entrada, cada una con su nivel de confianza:
--   · COLABORADORES (/fichajes/enviar, con clave): se publica al momento como
--     "rumor" o "confirmado". Entra por `fichajes_enviar`, que comprueba la
--     clave contra un hash bcrypt. La clave nunca viaja al JavaScript.
--   · ATLETAS (/fichajes/mi-fichaje, sin clave): cualquiera puede escribir en
--     ese formulario y decir que es cualquiera, así que NO se publica solo: va a
--     `fichajes_propuestas` (tabla privada) y tú lo apruebas en /admin/fichajes.
--     El contacto que dejen solo lo ves tú; nunca se copia al directo.
--   · TÚ, desde el panel: aprobar, cambiar rumor ⇄ confirmado, ocultar, borrar.
--
-- Diseño general: la web es un sitio estático (GitHub Pages), sin servidor
-- propio. anon solo puede LEER los fichajes visibles; toda escritura pasa por
-- funciones SECURITY DEFINER con validación, límite de ritmo y antiduplicados.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. FICHAJES (el directo)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fichajes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Hora a la que se informó del fichaje: la que se pinta y ordena el directo.
  informado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  atleta           TEXT NOT NULL CHECK (length(btrim(atleta)) BETWEEN 3 AND 120),
  club_origen      TEXT CHECK (club_origen IS NULL OR length(btrim(club_origen)) BETWEEN 2 AND 120),
  club_destino     TEXT CHECK (club_destino IS NULL OR length(btrim(club_destino)) BETWEEN 2 AND 120),
  CONSTRAINT fichajes_algun_club CHECK (club_origen IS NOT NULL OR club_destino IS NOT NULL),
  division_destino TEXT CHECK (division_destino IS NULL OR length(btrim(division_destino)) <= 80),
  fuente           TEXT CHECK (fuente IS NULL OR length(fuente) <= 200),
  nota             TEXT CHECK (nota IS NULL OR length(nota) <= 400),
  visible          BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Actualización v1 → v2 (no hace nada en una instalación nueva) ──
-- La v1 llamaba `division` a la del club de destino.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'fichajes' AND column_name = 'division')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'fichajes' AND column_name = 'division_destino')
  THEN
    ALTER TABLE fichajes RENAME COLUMN division TO division_destino;
  END IF;
END $$;

-- Rumor o confirmado: lo elige quien lo manda; tú puedes cambiarlo después.
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'rumor';
-- Sexo del atleta: decide en qué división compite cada club (un club puede
-- estar en DH en hombres y en Primera en mujeres).
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS genero TEXT;
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS division_origen TEXT;
-- Quién lo reportó: un colaborador, el propio atleta (aprobado por ti) o tú.
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS origen_envio TEXT NOT NULL DEFAULT 'colaborador';
-- La v1 guardaba el alias del colaborador; ya no se pide ni se guarda.
ALTER TABLE fichajes DROP COLUMN IF EXISTS enviado_por;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichajes_estado_chk') THEN
    ALTER TABLE fichajes ADD CONSTRAINT fichajes_estado_chk
      CHECK (estado IN ('rumor', 'confirmado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichajes_genero_chk') THEN
    ALTER TABLE fichajes ADD CONSTRAINT fichajes_genero_chk
      CHECK (genero IS NULL OR genero IN ('H', 'M'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichajes_div_origen_chk') THEN
    ALTER TABLE fichajes ADD CONSTRAINT fichajes_div_origen_chk
      CHECK (division_origen IS NULL OR length(btrim(division_origen)) <= 80);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichajes_origen_envio_chk') THEN
    ALTER TABLE fichajes ADD CONSTRAINT fichajes_origen_envio_chk
      CHECK (origen_envio IN ('colaborador', 'atleta', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fichajes_informado_idx ON fichajes (informado_en DESC);
CREATE INDEX IF NOT EXISTS fichajes_creado_idx    ON fichajes (creado_en DESC);

ALTER TABLE fichajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_fichajes" ON fichajes;
CREATE POLICY "public_read_fichajes"
  ON fichajes FOR SELECT
  TO anon, authenticated
  USING (visible = TRUE);

DROP POLICY IF EXISTS "auth_full_fichajes" ON fichajes;
CREATE POLICY "auth_full_fichajes"
  ON fichajes FOR ALL
  TO authenticated
  USING (TRUE) WITH CHECK (TRUE);


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. PROPUESTAS DE ATLETAS (privada: solo la ves tú)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fichajes_propuestas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atleta           TEXT NOT NULL CHECK (length(btrim(atleta)) BETWEEN 3 AND 120),
  genero           TEXT CHECK (genero IS NULL OR genero IN ('H', 'M')),
  club_origen      TEXT CHECK (club_origen IS NULL OR length(btrim(club_origen)) BETWEEN 2 AND 120),
  club_destino     TEXT CHECK (club_destino IS NULL OR length(btrim(club_destino)) BETWEEN 2 AND 120),
  CONSTRAINT propuestas_algun_club CHECK (club_origen IS NOT NULL OR club_destino IS NOT NULL),
  division_origen  TEXT CHECK (division_origen IS NULL OR length(btrim(division_origen)) <= 80),
  division_destino TEXT CHECK (division_destino IS NULL OR length(btrim(division_destino)) <= 80),
  nota             TEXT CHECK (nota IS NULL OR length(nota) <= 400),
  -- Para que puedas verificar que es el atleta. NUNCA se publica.
  contacto         TEXT CHECK (contacto IS NULL OR length(contacto) <= 160)
);

CREATE INDEX IF NOT EXISTS propuestas_creado_idx ON fichajes_propuestas (creado_en DESC);

ALTER TABLE fichajes_propuestas ENABLE ROW LEVEL SECURITY;

-- Sin ninguna política para anon: nadie de fuera puede leerla.
DROP POLICY IF EXISTS "auth_full_propuestas" ON fichajes_propuestas;
CREATE POLICY "auth_full_propuestas"
  ON fichajes_propuestas FOR ALL
  TO authenticated
  USING (TRUE) WITH CHECK (TRUE);


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. CLAVE DE COLABORADOR
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fichajes_clave (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hash           TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fichajes_clave ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fichajes_clave FROM anon, authenticated;

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

REVOKE ALL ON FUNCTION fichajes_set_clave(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_set_clave(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION fichajes_clave_estado()
RETURNS TABLE (configurada BOOLEAN, actualizado_en TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM fichajes_clave WHERE id = 1),
         (SELECT c.actualizado_en FROM fichajes_clave c WHERE c.id = 1);
$fn$;

REVOKE ALL ON FUNCTION fichajes_clave_estado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_clave_estado() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ENVÍO DE COLABORADOR (con clave → se publica al momento)
-- ═════════════════════════════════════════════════════════════════════════════

-- La firma cambió en la v2 (estado, sexo, divisiones; sin alias): se borra la vieja.
DROP FUNCTION IF EXISTS fichajes_enviar(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION fichajes_enviar(
  p_clave            TEXT,
  p_atleta           TEXT,
  p_estado           TEXT        DEFAULT 'rumor',
  p_genero           TEXT        DEFAULT NULL,
  p_club_origen      TEXT        DEFAULT NULL,
  p_club_destino     TEXT        DEFAULT NULL,
  p_division_origen  TEXT        DEFAULT NULL,
  p_division_destino TEXT        DEFAULT NULL,
  p_informado_en     TIMESTAMPTZ DEFAULT NULL,
  p_fuente           TEXT        DEFAULT NULL,
  p_nota             TEXT        DEFAULT NULL
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
  v_momento   TIMESTAMPTZ := COALESCE(p_informado_en, NOW());
BEGIN
  SELECT hash INTO v_hash FROM fichajes_clave WHERE id = 1;
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'La clave de colaborador no está configurada todavía';
  END IF;
  IF crypt(COALESCE(p_clave, ''), v_hash) <> v_hash THEN
    PERFORM pg_sleep(0.4);   -- freno a la fuerza bruta
    RAISE EXCEPTION 'Clave incorrecta';
  END IF;

  IF length(v_atleta) < 3 THEN
    RAISE EXCEPTION 'Falta el nombre y los apellidos del atleta';
  END IF;
  IF v_origen IS NULL AND v_destino IS NULL THEN
    RAISE EXCEPTION 'Indica al menos el club de origen o el de destino';
  END IF;
  IF COALESCE(p_estado, 'rumor') NOT IN ('rumor', 'confirmado') THEN
    RAISE EXCEPTION 'El estado tiene que ser rumor o confirmado';
  END IF;
  IF p_genero IS NOT NULL AND p_genero NOT IN ('H', 'M') THEN
    RAISE EXCEPTION 'Sexo no válido';
  END IF;
  IF v_momento > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'La hora informada no puede estar en el futuro';
  END IF;
  IF v_momento < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'La hora informada es demasiado antigua para el directo';
  END IF;

  SELECT COUNT(*) INTO v_recientes FROM fichajes WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_recientes >= 40 THEN
    RAISE EXCEPTION 'Demasiados envíos en la última hora; prueba más tarde';
  END IF;

  IF EXISTS (
    SELECT 1 FROM fichajes
     WHERE lower(atleta) = lower(v_atleta)
       AND COALESCE(lower(club_destino), '') = COALESCE(lower(v_destino), '')
       AND creado_en > NOW() - INTERVAL '1 hour'
  ) THEN
    RAISE EXCEPTION 'Ese fichaje ya se ha publicado hace unos minutos';
  END IF;

  INSERT INTO fichajes (
    informado_en, atleta, estado, genero, club_origen, club_destino,
    division_origen, division_destino, fuente, nota, origen_envio
  ) VALUES (
    v_momento, v_atleta, COALESCE(p_estado, 'rumor'), p_genero, v_origen, v_destino,
    NULLIF(btrim(COALESCE(p_division_origen, '')), ''),
    NULLIF(btrim(COALESCE(p_division_destino, '')), ''),
    NULLIF(btrim(COALESCE(p_fuente, '')), ''),
    NULLIF(btrim(COALESCE(p_nota, '')), ''),
    'colaborador'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION fichajes_enviar(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT
) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. PROPUESTA DE UN ATLETA (sin clave → a revisión, nunca se publica sola)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fichajes_proponer(
  p_atleta           TEXT,
  p_genero           TEXT DEFAULT NULL,
  p_club_origen      TEXT DEFAULT NULL,
  p_club_destino     TEXT DEFAULT NULL,
  p_division_origen  TEXT DEFAULT NULL,
  p_division_destino TEXT DEFAULT NULL,
  p_nota             TEXT DEFAULT NULL,
  p_contacto         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id        UUID;
  v_recientes INT;
  v_atleta    TEXT := btrim(COALESCE(p_atleta, ''));
  v_origen    TEXT := NULLIF(btrim(COALESCE(p_club_origen, '')), '');
  v_destino   TEXT := NULLIF(btrim(COALESCE(p_club_destino, '')), '');
BEGIN
  IF length(v_atleta) < 3 THEN
    RAISE EXCEPTION 'Falta tu nombre y apellidos';
  END IF;
  IF v_origen IS NULL AND v_destino IS NULL THEN
    RAISE EXCEPTION 'Indica al menos tu club de origen o el de destino';
  END IF;
  IF p_genero IS NOT NULL AND p_genero NOT IN ('H', 'M') THEN
    RAISE EXCEPTION 'Sexo no válido';
  END IF;

  -- Formulario público: límite global más estricto que el de colaboradores.
  SELECT COUNT(*) INTO v_recientes
    FROM fichajes_propuestas WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_recientes >= 20 THEN
    RAISE EXCEPTION 'Hay muchas propuestas pendientes; prueba dentro de un rato';
  END IF;

  IF EXISTS (
    SELECT 1 FROM fichajes_propuestas
     WHERE lower(atleta) = lower(v_atleta)
       AND COALESCE(lower(club_destino), '') = COALESCE(lower(v_destino), '')
       AND creado_en > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Ya nos ha llegado tu fichaje; lo revisamos en breve';
  END IF;

  INSERT INTO fichajes_propuestas (
    atleta, genero, club_origen, club_destino,
    division_origen, division_destino, nota, contacto
  ) VALUES (
    v_atleta, p_genero, v_origen, v_destino,
    NULLIF(btrim(COALESCE(p_division_origen, '')), ''),
    NULLIF(btrim(COALESCE(p_division_destino, '')), ''),
    NULLIF(btrim(COALESCE(p_nota, '')), ''),
    NULLIF(btrim(COALESCE(p_contacto, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION fichajes_proponer(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. APROBAR UNA PROPUESTA (solo tú, desde /admin/fichajes)
-- ═════════════════════════════════════════════════════════════════════════════
-- Copia la propuesta al directo y la borra, todo de una vez. El contacto NO se
-- copia: se queda solo contigo hasta que se borra la propuesta.

CREATE OR REPLACE FUNCTION fichajes_aprobar(p_id UUID, p_estado TEXT DEFAULT 'confirmado')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_prop fichajes_propuestas%ROWTYPE;
  v_id   UUID;
BEGIN
  IF COALESCE(p_estado, '') NOT IN ('rumor', 'confirmado') THEN
    RAISE EXCEPTION 'El estado tiene que ser rumor o confirmado';
  END IF;

  SELECT * INTO v_prop FROM fichajes_propuestas WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa propuesta ya no existe';
  END IF;

  INSERT INTO fichajes (
    informado_en, atleta, estado, genero, club_origen, club_destino,
    division_origen, division_destino, nota, origen_envio
  ) VALUES (
    v_prop.creado_en, v_prop.atleta, p_estado, v_prop.genero,
    v_prop.club_origen, v_prop.club_destino,
    v_prop.division_origen, v_prop.division_destino, v_prop.nota, 'atleta'
  )
  RETURNING id INTO v_id;

  DELETE FROM fichajes_propuestas WHERE id = p_id;
  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION fichajes_aprobar(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_aprobar(UUID, TEXT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. LIMPIEZA (la sección es temporal)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cuando el mercado se cierre y quites la sección, para borrarlo todo:
--     DROP FUNCTION IF EXISTS fichajes_aprobar(UUID, TEXT);
--     DROP FUNCTION IF EXISTS fichajes_proponer(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS fichajes_enviar(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS fichajes_set_clave(TEXT);
--     DROP FUNCTION IF EXISTS fichajes_clave_estado();
--     DROP TABLE IF EXISTS fichajes_propuestas;
--     DROP TABLE IF EXISTS fichajes_clave;
--     DROP TABLE IF EXISTS fichajes;
