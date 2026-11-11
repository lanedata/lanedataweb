-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Mercado de fichajes  (v3: tokens por colaborador, bombas,
-- colores de club, portada desde admin, tablón y avisos push)
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
-- 3b. COLABORADORES CON TOKEN PERSONAL (v3)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cada colaborador tiene su propio token (lo genera el panel). Sirve para saber
-- quién ha subido cada fichaje y para cortarle el acceso a uno sin tocar al
-- resto. Solo lo ves tú (sin políticas para anon). El enlace personal lleva el
-- token detrás de un # (/fichajes/enviar/#t=...), que no viaja a ningún servidor.

CREATE TABLE IF NOT EXISTS fichajes_colaboradores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre          TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 2 AND 80),
  token           TEXT NOT NULL UNIQUE DEFAULT ('ld' || encode(gen_random_bytes(12), 'hex'))
                  CHECK (length(token) >= 16),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  revocado_en     TIMESTAMPTZ,
  ultimo_envio_en TIMESTAMPTZ,
  nota            TEXT CHECK (nota IS NULL OR length(nota) <= 200)
);

ALTER TABLE fichajes_colaboradores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fichajes_colaboradores FROM anon;

DROP POLICY IF EXISTS "auth_full_colaboradores" ON fichajes_colaboradores;
CREATE POLICY "auth_full_colaboradores"
  ON fichajes_colaboradores FOR ALL
  TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

-- Quién subió cada fichaje (NULL = clave general antigua, atleta o tú).
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS colaborador_id UUID
  REFERENCES fichajes_colaboradores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fichajes_colaborador_idx ON fichajes (colaborador_id, creado_en DESC);

-- Fichaje bomba: lo marcas tú y se resalta en el directo y en las historias.
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS bomba BOOLEAN NOT NULL DEFAULT FALSE;

-- El formulario saluda al colaborador por su nombre al abrir su enlace (y así
-- sabe al momento si su acceso sigue activo). Solo devuelve el nombre.
CREATE OR REPLACE FUNCTION fichajes_quien_soy(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_colab fichajes_colaboradores%ROWTYPE;
BEGIN
  SELECT * INTO v_colab FROM fichajes_colaboradores WHERE token = btrim(COALESCE(p_token, ''));
  IF NOT FOUND THEN
    PERFORM pg_sleep(0.4);
    RAISE EXCEPTION 'Ese enlace de colaborador no es válido';
  END IF;
  IF NOT v_colab.activo THEN
    RAISE EXCEPTION 'Tu acceso de colaborador está revocado. Habla con lanedata.';
  END IF;
  RETURN v_colab.nombre;
END;
$fn$;

GRANT EXECUTE ON FUNCTION fichajes_quien_soy(TEXT) TO anon, authenticated;

-- Para dejar de aceptar la clave general antigua cuando ya todos tengan token.
CREATE OR REPLACE FUNCTION fichajes_borrar_clave()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  DELETE FROM fichajes_clave WHERE id = 1;
  SELECT 'Clave general borrada'::TEXT;
$fn$;

REVOKE ALL ON FUNCTION fichajes_borrar_clave() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_borrar_clave() TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ENVÍO DE COLABORADOR (con token o clave → se publica al momento)
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
  v_colab     fichajes_colaboradores%ROWTYPE;
  v_colab_id  UUID;
  v_atleta    TEXT := btrim(COALESCE(p_atleta, ''));
  v_origen    TEXT := NULLIF(btrim(COALESCE(p_club_origen, '')), '');
  v_destino   TEXT := NULLIF(btrim(COALESCE(p_club_destino, '')), '');
  v_momento   TIMESTAMPTZ := COALESCE(p_informado_en, NOW());
BEGIN
  -- v3: primero se busca el TOKEN PERSONAL del colaborador (revocable, y deja
  -- constancia de quién sube qué). Si no es un token, se prueba la clave
  -- general antigua, que sigue valiendo hasta que la borres en el panel.
  SELECT * INTO v_colab FROM fichajes_colaboradores WHERE token = btrim(COALESCE(p_clave, ''));
  IF FOUND THEN
    IF NOT v_colab.activo THEN
      RAISE EXCEPTION 'Tu acceso de colaborador está revocado. Habla con lanedata.';
    END IF;
    v_colab_id := v_colab.id;
    SELECT COUNT(*) INTO v_recientes FROM fichajes
     WHERE colaborador_id = v_colab_id AND creado_en > NOW() - INTERVAL '1 hour';
    IF v_recientes >= 25 THEN
      RAISE EXCEPTION 'Has enviado muchos fichajes en la última hora; espera un poco';
    END IF;
  ELSE
    SELECT hash INTO v_hash FROM fichajes_clave WHERE id = 1;
    IF v_hash IS NULL OR crypt(COALESCE(p_clave, ''), v_hash) <> v_hash THEN
      PERFORM pg_sleep(0.4);   -- freno a la fuerza bruta
      RAISE EXCEPTION 'Clave incorrecta';
    END IF;
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
    division_origen, division_destino, fuente, nota, origen_envio, colaborador_id
  ) VALUES (
    v_momento, v_atleta, COALESCE(p_estado, 'rumor'), p_genero, v_origen, v_destino,
    NULLIF(btrim(COALESCE(p_division_origen, '')), ''),
    NULLIF(btrim(COALESCE(p_division_destino, '')), ''),
    NULLIF(btrim(COALESCE(p_fuente, '')), ''),
    NULLIF(btrim(COALESCE(p_nota, '')), ''),
    'colaborador', v_colab_id
  )
  RETURNING id INTO v_id;

  IF v_colab_id IS NOT NULL THEN
    UPDATE fichajes_colaboradores SET ultimo_envio_en = NOW() WHERE id = v_colab_id;
  END IF;

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
-- 6b. COLORES Y ESCUDOS DE LOS CLUBES (v3)
-- ═════════════════════════════════════════════════════════════════════════════
-- Se pintan en el directo y en las historias. El nombre es el de la RFEA (el
-- mismo que guarda el fichaje). Los escudos van al bucket público `clubes`.

CREATE TABLE IF NOT EXISTS clubes_estilo (
  nombre          TEXT PRIMARY KEY CHECK (length(btrim(nombre)) BETWEEN 2 AND 120),
  color           TEXT CHECK (color  IS NULL OR color  ~ '^#[0-9A-Fa-f]{6}$'),
  color2          TEXT CHECK (color2 IS NULL OR color2 ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url        TEXT CHECK (logo_url IS NULL OR length(logo_url) <= 500),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clubes_estilo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_clubes_estilo" ON clubes_estilo;
CREATE POLICY "public_read_clubes_estilo" ON clubes_estilo FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_full_clubes_estilo" ON clubes_estilo;
CREATE POLICY "auth_full_clubes_estilo" ON clubes_estilo FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

INSERT INTO storage.buckets (id, name, public) VALUES ('clubes', 'clubes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_clubes" ON storage.objects;
CREATE POLICY "public_read_clubes" ON storage.objects FOR SELECT USING (bucket_id = 'clubes');
DROP POLICY IF EXISTS "auth_insert_clubes" ON storage.objects;
CREATE POLICY "auth_insert_clubes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clubes');
DROP POLICY IF EXISTS "auth_update_clubes" ON storage.objects;
CREATE POLICY "auth_update_clubes" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'clubes');
DROP POLICY IF EXISTS "auth_delete_clubes" ON storage.objects;
CREATE POLICY "auth_delete_clubes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'clubes');


-- ═════════════════════════════════════════════════════════════════════════════
-- 6c. AJUSTES DE LA WEB (v3): dónde sale el mercado en la portada
-- ═════════════════════════════════════════════════════════════════════════════
-- La portada es estática, pero lee este ajuste al cargar: mover el mercado
-- desde /admin/fichajes no necesita volver a desplegar.

CREATE TABLE IF NOT EXISTS web_ajustes (
  clave          TEXT PRIMARY KEY,
  valor          JSONB NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE web_ajustes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_web_ajustes" ON web_ajustes;
CREATE POLICY "public_read_web_ajustes" ON web_ajustes FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_full_web_ajustes" ON web_ajustes;
CREATE POLICY "auth_full_web_ajustes" ON web_ajustes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

INSERT INTO web_ajustes (clave, valor) VALUES ('mercado_portada', '{"posicion": "oculto"}')
ON CONFLICT (clave) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6d. TABLÓN: atletas que buscan club y clubes que buscan atletas (v3)
-- ═════════════════════════════════════════════════════════════════════════════
-- Todo anuncio entra como `pendiente` y solo sale en la web cuando tú lo
-- publicas. El contacto NUNCA es legible desde fuera (permiso por columnas).
-- Quien se interesa por un anuncio deja sus datos en `mercado_interesados`,
-- que solo ves tú: tú los pones en contacto.

CREATE TABLE IF NOT EXISTS mercado_anuncios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  publicado_en  TIMESTAMPTZ,
  tipo          TEXT NOT NULL CHECK (tipo IN ('atleta', 'club')),
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'publicado', 'cerrado')),
  -- Atleta: su nombre. Club: el nombre del club.
  autor         TEXT NOT NULL CHECK (length(btrim(autor)) BETWEEN 3 AND 120),
  club_actual   TEXT CHECK (club_actual IS NULL OR length(club_actual) <= 120),
  genero        TEXT CHECK (genero IS NULL OR genero IN ('H', 'M', 'X')),
  pruebas       TEXT CHECK (pruebas IS NULL OR length(pruebas) <= 160),
  zona          TEXT CHECK (zona IS NULL OR length(zona) <= 80),
  -- Lo que busca / ofrece, en sus palabras.
  texto         TEXT NOT NULL CHECK (length(btrim(texto)) BETWEEN 10 AND 800),
  perfil_url    TEXT CHECK (perfil_url IS NULL OR perfil_url ~ '^https://(www\.)?mundoatletismo\.es/'),
  contacto      TEXT CHECK (contacto IS NULL OR length(contacto) <= 160)
);

CREATE INDEX IF NOT EXISTS anuncios_estado_idx ON mercado_anuncios (estado, publicado_en DESC);

ALTER TABLE mercado_anuncios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_anuncios" ON mercado_anuncios;
CREATE POLICY "public_read_anuncios" ON mercado_anuncios FOR SELECT TO anon USING (estado = 'publicado');
DROP POLICY IF EXISTS "auth_full_anuncios" ON mercado_anuncios;
CREATE POLICY "auth_full_anuncios" ON mercado_anuncios FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
-- anon solo puede leer estas columnas (el contacto no está).
REVOKE ALL ON TABLE mercado_anuncios FROM anon;
GRANT SELECT (id, publicado_en, tipo, estado, autor, club_actual, genero, pruebas, zona, texto, perfil_url)
  ON mercado_anuncios TO anon;

CREATE TABLE IF NOT EXISTS mercado_interesados (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anuncio_id UUID NOT NULL REFERENCES mercado_anuncios(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 2 AND 120),
  mensaje    TEXT CHECK (mensaje IS NULL OR length(mensaje) <= 600),
  contacto   TEXT NOT NULL CHECK (length(btrim(contacto)) BETWEEN 3 AND 160),
  atendido   BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE mercado_interesados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mercado_interesados FROM anon;
DROP POLICY IF EXISTS "auth_full_interesados" ON mercado_interesados;
CREATE POLICY "auth_full_interesados" ON mercado_interesados FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION mercado_anunciar(
  p_tipo TEXT, p_autor TEXT, p_texto TEXT,
  p_club_actual TEXT DEFAULT NULL, p_genero TEXT DEFAULT NULL, p_pruebas TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL, p_perfil_url TEXT DEFAULT NULL, p_contacto TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id UUID;
  v_n  INT;
BEGIN
  IF p_tipo NOT IN ('atleta', 'club') THEN RAISE EXCEPTION 'Tipo de anuncio no válido'; END IF;
  IF length(btrim(COALESCE(p_autor, ''))) < 3 THEN RAISE EXCEPTION 'Falta el nombre'; END IF;
  IF length(btrim(COALESCE(p_texto, ''))) < 10 THEN RAISE EXCEPTION 'Cuéntalo con un poco más de detalle'; END IF;
  IF length(btrim(COALESCE(p_contacto, ''))) < 3 THEN RAISE EXCEPTION 'Deja un contacto para que podamos verificarlo'; END IF;
  IF p_perfil_url IS NOT NULL AND btrim(p_perfil_url) <> ''
     AND p_perfil_url !~ '^https://(www\.)?mundoatletismo\.es/' THEN
    RAISE EXCEPTION 'El perfil tiene que ser un enlace de mundoatletismo.es';
  END IF;
  SELECT COUNT(*) INTO v_n FROM mercado_anuncios WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_n >= 20 THEN RAISE EXCEPTION 'Hay muchos anuncios pendientes; prueba dentro de un rato'; END IF;
  IF EXISTS (SELECT 1 FROM mercado_anuncios WHERE lower(autor) = lower(btrim(p_autor))
               AND tipo = p_tipo AND estado <> 'cerrado' AND creado_en > NOW() - INTERVAL '24 hours') THEN
    RAISE EXCEPTION 'Ya nos ha llegado tu anuncio; lo revisamos en breve';
  END IF;

  INSERT INTO mercado_anuncios (tipo, autor, texto, club_actual, genero, pruebas, zona, perfil_url, contacto)
  VALUES (p_tipo, btrim(p_autor), btrim(p_texto),
          NULLIF(btrim(COALESCE(p_club_actual, '')), ''), NULLIF(p_genero, ''),
          NULLIF(btrim(COALESCE(p_pruebas, '')), ''), NULLIF(btrim(COALESCE(p_zona, '')), ''),
          NULLIF(btrim(COALESCE(p_perfil_url, '')), ''), btrim(p_contacto))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION mercado_anunciar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION mercado_interes(p_anuncio UUID, p_nombre TEXT, p_contacto TEXT, p_mensaje TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id UUID;
  v_n  INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mercado_anuncios WHERE id = p_anuncio AND estado = 'publicado') THEN
    RAISE EXCEPTION 'Ese anuncio ya no está activo';
  END IF;
  IF length(btrim(COALESCE(p_nombre, ''))) < 2 THEN RAISE EXCEPTION 'Falta tu nombre'; END IF;
  IF length(btrim(COALESCE(p_contacto, ''))) < 3 THEN RAISE EXCEPTION 'Falta cómo contactarte'; END IF;
  SELECT COUNT(*) INTO v_n FROM mercado_interesados WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_n >= 40 THEN RAISE EXCEPTION 'Demasiados mensajes ahora mismo; prueba más tarde'; END IF;
  IF EXISTS (SELECT 1 FROM mercado_interesados WHERE anuncio_id = p_anuncio
               AND lower(contacto) = lower(btrim(p_contacto))) THEN
    RAISE EXCEPTION 'Ya nos habías dejado tu interés en este anuncio';
  END IF;
  INSERT INTO mercado_interesados (anuncio_id, nombre, contacto, mensaje)
  VALUES (p_anuncio, btrim(p_nombre), btrim(p_contacto), NULLIF(btrim(COALESCE(p_mensaje, '')), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION mercado_interes(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6e. NOTIFICACIONES PUSH AL MÓVIL (v3)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cada vez que entra algo (fichaje de colaborador, propuesta de atleta,
-- anuncio del tablón o interesado) un trigger llama a la Edge Function
-- `fichajes-push` (supabase/functions/fichajes-push), que manda el aviso a los
-- móviles suscritos desde /admin/movil. Si la función no está desplegada o
-- falla, el envío del formulario NO se ve afectado.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS push_suscripciones (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  etiqueta   TEXT,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE push_suscripciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE push_suscripciones FROM anon;
DROP POLICY IF EXISTS "auth_full_push" ON push_suscripciones;
CREATE POLICY "auth_full_push" ON push_suscripciones FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- URL de la función y secreto compartido. Sin políticas: solo la leen las
-- funciones SECURITY DEFINER y la Edge Function (service role).
CREATE TABLE IF NOT EXISTS avisos_config (
  id      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  url     TEXT,
  secreto TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex')
);
ALTER TABLE avisos_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE avisos_config FROM anon, authenticated;
INSERT INTO avisos_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION avisos_configurar(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_url !~ '^https://[a-z0-9.-]+/functions/v1/fichajes-push$' THEN
    RAISE EXCEPTION 'URL de la función no válida';
  END IF;
  UPDATE avisos_config SET url = p_url WHERE id = 1;
  RETURN 'Avisos conectados';
END;
$fn$;
REVOKE ALL ON FUNCTION avisos_configurar(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION avisos_configurar(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION avisos_disparar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $fn$
DECLARE
  v_cfg  avisos_config%ROWTYPE;
  -- La fila como JSON: este trigger lo comparten cuatro tablas con columnas
  -- distintas, y acceder a NEW.<columna> que no existe en una de ellas hace
  -- fallar el INSERT entero («record "new" has no field …»).
  v_fila JSONB := to_jsonb(NEW);
BEGIN
  -- Todo va dentro de un bloque con EXCEPTION: pase lo que pase, un aviso
  -- perdido nunca debe tumbar un envío.
  BEGIN
    -- Lo que apruebas tú mismo no te avisa.
    IF TG_TABLE_NAME = 'fichajes' AND COALESCE(v_fila->>'origen_envio', '') <> 'colaborador' THEN
      RETURN NEW;
    END IF;
    SELECT * INTO v_cfg FROM avisos_config WHERE id = 1;
    IF v_cfg.url IS NULL THEN RETURN NEW; END IF;
    PERFORM net.http_post(
      url     := v_cfg.url,
      body    := jsonb_build_object('tabla', TG_TABLE_NAME, 'id', v_fila->>'id'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', v_cfg.secreto)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'avisos_disparar (%): %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS avisos_fichajes ON fichajes;
CREATE TRIGGER avisos_fichajes AFTER INSERT ON fichajes FOR EACH ROW EXECUTE FUNCTION avisos_disparar();
DROP TRIGGER IF EXISTS avisos_propuestas ON fichajes_propuestas;
CREATE TRIGGER avisos_propuestas AFTER INSERT ON fichajes_propuestas FOR EACH ROW EXECUTE FUNCTION avisos_disparar();
DROP TRIGGER IF EXISTS avisos_anuncios ON mercado_anuncios;
CREATE TRIGGER avisos_anuncios AFTER INSERT ON mercado_anuncios FOR EACH ROW EXECUTE FUNCTION avisos_disparar();
DROP TRIGGER IF EXISTS avisos_interesados ON mercado_interesados;
CREATE TRIGGER avisos_interesados AFTER INSERT ON mercado_interesados FOR EACH ROW EXECUTE FUNCTION avisos_disparar();


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. LIMPIEZA (la sección es temporal)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cuando el mercado se cierre y quites la sección, para borrarlo todo:
--     DROP FUNCTION IF EXISTS fichajes_aprobar(UUID, TEXT);
--     DROP FUNCTION IF EXISTS fichajes_proponer(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS fichajes_enviar(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS fichajes_set_clave(TEXT);
--     DROP FUNCTION IF EXISTS fichajes_clave_estado();
--     DROP TABLE IF EXISTS mercado_interesados, mercado_anuncios, push_suscripciones,
--       avisos_config, clubes_estilo, web_ajustes;
--     DROP FUNCTION IF EXISTS mercado_anunciar(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS mercado_interes(UUID,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS avisos_disparar() CASCADE;
--     DROP FUNCTION IF EXISTS avisos_configurar(TEXT);
--     DROP FUNCTION IF EXISTS fichajes_quien_soy(TEXT);
--     DROP FUNCTION IF EXISTS fichajes_borrar_clave();
--     DROP TABLE IF EXISTS fichajes_propuestas;
--     DROP TABLE IF EXISTS fichajes_clave;
--     DROP TABLE IF EXISTS fichajes;
--     DROP TABLE IF EXISTS fichajes_colaboradores;
