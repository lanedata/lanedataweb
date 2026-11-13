-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Mercado de fichajes  (v5: colaboradores con Google y lista blanca,
-- chivatazos, incidencias, bombas, colores de club, tablón y avisos push)
--
-- ANTES que este, ejecuta supabase/roles-schema.sql (define quién es admin).
-- Ejecuta este fichero ENTERO en Supabase (Dashboard > SQL Editor > New query).
-- Es idempotente: puedes volver a lanzarlo sin romper nada. Si ya tenías la v1
-- aplicada, al relanzarlo se ACTUALIZA en sitio sin perder datos.
--
-- Los colaboradores se dan de alta por su correo en el panel: /admin/fichajes.
--
-- Vías de entrada, cada una con su nivel de confianza:
--   · COLABORADORES (/fichajes/enviar, con sesión): se publica al momento como
--     "rumor" o "confirmado". Entra por `colab_publicar`, que mira quién ha
--     iniciado sesión y si su correo está en `fichajes_colaboradores`. Además
--     ven lo publicado (sin saber por quién), marcan incidencias y revisan
--     los chivatazos.
--   · ATLETAS (/fichajes/mi-fichaje, sin clave): cualquiera puede escribir en
--     ese formulario y decir que es cualquiera, así que NO se publica solo: va a
--     `fichajes_propuestas` (tabla privada) y tú lo apruebas en /admin/fichajes.
--     El contacto que dejen solo lo ves tú; nunca se copia al directo.
--   · CHIVATAZOS (/fichajes/mi-fichaje/#chivatazo, sin clave): cualquiera que se haya
--     enterado de un fichaje. Misma cola de revisión que los atletas, marcados
--     con tipo = 'chivatazo'. Tampoco se publican solos.
--   · TÚ, desde el panel: aprobar, cambiar rumor ⇄ confirmado, ocultar, borrar.
--
-- Diseño general: la web es un sitio estático (GitHub Pages), sin servidor
-- propio. anon solo puede LEER los fichajes visibles; toda escritura pasa por
-- funciones SECURITY DEFINER con validación, límite de ritmo y antiduplicados.
-- Tener sesión NO da permisos: las tablas solo las toca quien es admin
-- (`es_admin()`); los colaboradores pasan siempre por las funciones `colab_*`.
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
  USING (es_admin()) WITH CHECK (es_admin());


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

-- v4 · CHIVATAZOS (/fichajes/mi-fichaje/#chivatazo): cualquiera que se haya enterado de un
-- fichaje lo manda sin clave. Va a esta misma cola de revisión, marcado con
-- `tipo`, y puede traer de dónde ha salido la noticia (`fuente`).
ALTER TABLE fichajes_propuestas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'atleta';
ALTER TABLE fichajes_propuestas ADD COLUMN IF NOT EXISTS fuente TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propuestas_tipo_chk') THEN
    ALTER TABLE fichajes_propuestas ADD CONSTRAINT propuestas_tipo_chk
      CHECK (tipo IN ('atleta', 'chivatazo'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propuestas_fuente_chk') THEN
    ALTER TABLE fichajes_propuestas ADD CONSTRAINT propuestas_fuente_chk
      CHECK (fuente IS NULL OR length(fuente) <= 200);
  END IF;
END $$;

-- v5: los colaboradores revisan los chivatazos. Si uno lo descarta no se borra:
-- deja de salirles a ellos y a ti te queda marcado, por si quieres repescarlo.
ALTER TABLE fichajes_propuestas ADD COLUMN IF NOT EXISTS descartada_en TIMESTAMPTZ;
ALTER TABLE fichajes_propuestas ADD COLUMN IF NOT EXISTS descartada_por UUID;

-- Un chivatazo aprobado queda en el directo con origen_envio = 'chivatazo'
-- (así no lleva la etiqueta «lo cuenta el atleta»).
ALTER TABLE fichajes DROP CONSTRAINT IF EXISTS fichajes_origen_envio_chk;
ALTER TABLE fichajes ADD CONSTRAINT fichajes_origen_envio_chk
  CHECK (origen_envio IN ('colaborador', 'atleta', 'admin', 'chivatazo'));

ALTER TABLE fichajes_propuestas ENABLE ROW LEVEL SECURITY;

-- Sin ninguna política para anon: nadie de fuera puede leerla.
DROP POLICY IF EXISTS "auth_full_propuestas" ON fichajes_propuestas;
CREATE POLICY "auth_full_propuestas"
  ON fichajes_propuestas FOR ALL
  TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. COLABORADORES: ENTRAN CON SU CORREO (v5)
-- ═════════════════════════════════════════════════════════════════════════════
-- Esta tabla es la LISTA BLANCA de colaboradores: una fila por persona, con su
-- CORREO de Google. Entra en /fichajes/enviar (el mismo enlace para todos) con
-- «Continuar con Google»; Google garantiza que el correo es suyo y aquí se mira
-- si está en la lista. Sin contraseñas: no hay nada que adivinar a la fuerza.
-- Tú decides quién entra: añades o quitas correos en /admin/fichajes.
--
-- Ya no hay clave general ni enlaces con token: quien tuviera uno deja de
-- poder publicar hasta que le pongas su correo. La columna `token` se queda
-- por compatibilidad, sin uso.

DROP FUNCTION IF EXISTS fichajes_enviar(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS fichajes_enviar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT);
DROP FUNCTION IF EXISTS fichajes_quien_soy(TEXT);
DROP FUNCTION IF EXISTS fichajes_set_clave(TEXT);
DROP FUNCTION IF EXISTS fichajes_clave_estado();
DROP FUNCTION IF EXISTS fichajes_borrar_clave();
DROP TABLE IF EXISTS fichajes_clave;

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

-- Correo con el que entra (en minúsculas) y la cuenta de Supabase Auth que lo
-- ha usado, que se enlaza sola la primera vez que inicia sesión.
ALTER TABLE fichajes_colaboradores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE fichajes_colaboradores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE fichajes_colaboradores ADD COLUMN IF NOT EXISTS ultimo_acceso_en TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colaboradores_email_chk') THEN
    ALTER TABLE fichajes_colaboradores ADD CONSTRAINT colaboradores_email_chk
      CHECK (email IS NULL OR (email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length(email) <= 160));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_email_idx ON fichajes_colaboradores (email) WHERE email IS NOT NULL;

DROP POLICY IF EXISTS "auth_full_colaboradores" ON fichajes_colaboradores;
CREATE POLICY "auth_full_colaboradores"
  ON fichajes_colaboradores FOR ALL
  TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

-- Quién subió cada fichaje (NULL = clave general antigua, atleta o tú).
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS colaborador_id UUID
  REFERENCES fichajes_colaboradores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fichajes_colaborador_idx ON fichajes (colaborador_id, creado_en DESC);

-- Fichaje bomba: lo marcas tú y se resalta en el directo y en las historias.
ALTER TABLE fichajes ADD COLUMN IF NOT EXISTS bomba BOOLEAN NOT NULL DEFAULT FALSE;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. PROPUESTA DE UN ATLETA (sin clave → a revisión, nunca se publica sola)
-- ═════════════════════════════════════════════════════════════════════════════

-- La firma creció en la v4 (tipo y fuente, para los chivatazos): se borra la
-- vieja para que no queden dos funciones con el mismo nombre.
DROP FUNCTION IF EXISTS fichajes_proponer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION fichajes_proponer(
  p_atleta           TEXT,
  p_genero           TEXT DEFAULT NULL,
  p_club_origen      TEXT DEFAULT NULL,
  p_club_destino     TEXT DEFAULT NULL,
  p_division_origen  TEXT DEFAULT NULL,
  p_division_destino TEXT DEFAULT NULL,
  p_nota             TEXT DEFAULT NULL,
  p_contacto         TEXT DEFAULT NULL,
  p_tipo             TEXT DEFAULT 'atleta',
  p_fuente           TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id        UUID;
  v_recientes INT;
  v_atleta    TEXT := btrim(COALESCE(p_atleta, ''));
  v_origen    TEXT := NULLIF(btrim(COALESCE(p_club_origen, '')), '');
  v_destino   TEXT := NULLIF(btrim(COALESCE(p_club_destino, '')), '');
  v_tipo      TEXT := COALESCE(p_tipo, 'atleta');
BEGIN
  IF v_tipo NOT IN ('atleta', 'chivatazo') THEN
    RAISE EXCEPTION 'Tipo de envío no válido';
  END IF;
  IF length(v_atleta) < 3 THEN
    RAISE EXCEPTION 'Falta el nombre y los apellidos del atleta';
  END IF;
  IF v_origen IS NULL AND v_destino IS NULL THEN
    RAISE EXCEPTION 'Indica al menos el club de origen o el de destino';
  END IF;
  IF p_genero IS NOT NULL AND p_genero NOT IN ('H', 'M') THEN
    RAISE EXCEPTION 'Sexo no válido';
  END IF;

  -- Formulario público: límite global más estricto que el de colaboradores.
  SELECT COUNT(*) INTO v_recientes
    FROM fichajes_propuestas WHERE creado_en > NOW() - INTERVAL '1 hour';
  IF v_recientes >= 60 THEN
    RAISE EXCEPTION 'Nos están llegando muchos avisos a la vez; prueba dentro de un rato';
  END IF;

  IF EXISTS (
    SELECT 1 FROM fichajes_propuestas
     WHERE lower(atleta) = lower(v_atleta)
       AND COALESCE(lower(club_destino), '') = COALESCE(lower(v_destino), '')
       AND creado_en > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Ese fichaje ya nos ha llegado; lo revisamos en breve';
  END IF;

  INSERT INTO fichajes_propuestas (
    atleta, genero, club_origen, club_destino,
    division_origen, division_destino, nota, contacto, tipo, fuente
  ) VALUES (
    v_atleta, p_genero, v_origen, v_destino,
    NULLIF(btrim(COALESCE(p_division_origen, '')), ''),
    NULLIF(btrim(COALESCE(p_division_destino, '')), ''),
    NULLIF(btrim(COALESCE(p_nota, '')), ''),
    NULLIF(btrim(COALESCE(p_contacto, '')), ''),
    v_tipo,
    NULLIF(btrim(COALESCE(p_fuente, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION fichajes_proponer(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
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
  PERFORM exigir_admin();
  IF COALESCE(p_estado, '') NOT IN ('rumor', 'confirmado') THEN
    RAISE EXCEPTION 'El estado tiene que ser rumor o confirmado';
  END IF;

  SELECT * INTO v_prop FROM fichajes_propuestas WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa propuesta ya no existe';
  END IF;

  INSERT INTO fichajes (
    informado_en, atleta, estado, genero, club_origen, club_destino,
    division_origen, division_destino, nota, fuente, origen_envio
  ) VALUES (
    v_prop.creado_en, v_prop.atleta, p_estado, v_prop.genero,
    v_prop.club_origen, v_prop.club_destino,
    v_prop.division_origen, v_prop.division_destino, v_prop.nota, v_prop.fuente,
    CASE WHEN v_prop.tipo = 'chivatazo' THEN 'chivatazo' ELSE 'atleta' END
  )
  RETURNING id INTO v_id;

  DELETE FROM fichajes_propuestas WHERE id = p_id;
  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION fichajes_aprobar(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fichajes_aprobar(UUID, TEXT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6a. LO QUE HACE UN COLABORADOR (v5) — todo por funciones `colab_*`
-- ═════════════════════════════════════════════════════════════════════════════
-- Un colaborador no lee ni escribe ninguna tabla: solo llama a estas funciones,
-- que primero miran quién es (`colab_actual`). Nunca devuelven quién publicó
-- qué (entre ellos es anónimo; tú sí lo ves en el panel) ni el contacto de
-- quien manda un chivatazo.

-- Incidencias: «esto está mal» sobre un fichaje publicado. Las ve el autor
-- (para corregirlo) y tú. No salen en la web.
CREATE TABLE IF NOT EXISTS fichajes_incidencias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fichaje_id     UUID NOT NULL REFERENCES fichajes(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES fichajes_colaboradores(id) ON DELETE SET NULL,
  texto          TEXT NOT NULL CHECK (length(btrim(texto)) BETWEEN 5 AND 400),
  resuelta_en    TIMESTAMPTZ,
  resuelta_por   TEXT CHECK (resuelta_por IS NULL OR resuelta_por IN ('autor', 'admin'))
);
CREATE INDEX IF NOT EXISTS incidencias_fichaje_idx ON fichajes_incidencias (fichaje_id) WHERE resuelta_en IS NULL;

ALTER TABLE fichajes_incidencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fichajes_incidencias FROM anon;
DROP POLICY IF EXISTS "auth_full_incidencias" ON fichajes_incidencias;
CREATE POLICY "auth_full_incidencias" ON fichajes_incidencias FOR ALL TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

-- Quién es el colaborador que llama. El correo se lee de su cuenta (no de lo
-- que diga el navegador) y solo vale si está VERIFICADO (con Google lo está
-- siempre). Uso interno.
CREATE OR REPLACE FUNCTION colab_actual()
RETURNS fichajes_colaboradores
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_email TEXT;
  v_colab fichajes_colaboradores%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para entrar como colaborador';
  END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u
   WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Tu cuenta no tiene un correo verificado. Entra con Google.';
  END IF;
  SELECT * INTO v_colab FROM fichajes_colaboradores WHERE email = v_email;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El correo % no tiene acceso de colaborador. Pide a lanedata que lo añada.', v_email;
  END IF;
  IF NOT v_colab.activo THEN
    RAISE EXCEPTION 'Tu acceso de colaborador está revocado. Habla con lanedata.';
  END IF;
  IF v_colab.user_id IS DISTINCT FROM auth.uid() THEN
    UPDATE fichajes_colaboradores SET user_id = auth.uid() WHERE id = v_colab.id;
  END IF;
  RETURN v_colab;
END;
$fn$;
REVOKE ALL ON FUNCTION colab_actual() FROM PUBLIC, anon, authenticated;

-- Al entrar: quién soy y cuánto hay por revisar.
CREATE OR REPLACE FUNCTION colab_yo()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_yo fichajes_colaboradores%ROWTYPE := colab_actual();
BEGIN
  UPDATE fichajes_colaboradores SET ultimo_acceso_en = NOW() WHERE id = v_yo.id;
  RETURN jsonb_build_object(
    'nombre', v_yo.nombre,
    'email', v_yo.email,
    'chivatazos', (SELECT COUNT(*) FROM fichajes_propuestas WHERE tipo = 'chivatazo' AND descartada_en IS NULL),
    'incidencias', (SELECT COUNT(*) FROM fichajes_incidencias i JOIN fichajes f ON f.id = i.fichaje_id
                     WHERE i.resuelta_en IS NULL AND f.colaborador_id = v_yo.id)
  );
END;
$fn$;

-- Publicar un fichaje: sale en el directo al momento, a su nombre (solo tú lo ves).
CREATE OR REPLACE FUNCTION colab_publicar(
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_yo        fichajes_colaboradores%ROWTYPE := colab_actual();
  v_id        UUID;
  v_recientes INT;
  v_atleta    TEXT := btrim(COALESCE(p_atleta, ''));
  v_origen    TEXT := NULLIF(btrim(COALESCE(p_club_origen, '')), '');
  v_destino   TEXT := NULLIF(btrim(COALESCE(p_club_destino, '')), '');
  v_momento   TIMESTAMPTZ := COALESCE(p_informado_en, NOW());
BEGIN
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

  SELECT COUNT(*) INTO v_recientes FROM fichajes
   WHERE colaborador_id = v_yo.id AND creado_en > NOW() - INTERVAL '1 hour';
  IF v_recientes >= 25 THEN
    RAISE EXCEPTION 'Has enviado muchos fichajes en la última hora; espera un poco';
  END IF;

  -- Solo cuentan los que siguen a la vista: si retiras uno por un error,
  -- puedes volver a publicarlo bien.
  IF EXISTS (
    SELECT 1 FROM fichajes
     WHERE lower(atleta) = lower(v_atleta)
       AND COALESCE(lower(club_destino), '') = COALESCE(lower(v_destino), '')
       AND visible
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
    'colaborador', v_yo.id
  )
  RETURNING id INTO v_id;

  UPDATE fichajes_colaboradores SET ultimo_envio_en = NOW() WHERE id = v_yo.id;
  RETURN v_id;
END;
$fn$;

-- Todo lo publicado, sin decir por quién: solo si es mío. Con las incidencias
-- abiertas de cada uno. Los míos salen aunque estén retirados.
CREATE OR REPLACE FUNCTION colab_fichajes(p_limite INT DEFAULT 100)
RETURNS TABLE (
  id UUID, informado_en TIMESTAMPTZ, atleta TEXT, estado TEXT, genero TEXT,
  club_origen TEXT, club_destino TEXT, division_origen TEXT, division_destino TEXT,
  fuente TEXT, nota TEXT, bomba BOOLEAN, visible BOOLEAN, origen_envio TEXT,
  mio BOOLEAN, incidencias JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
#variable_conflict use_column
DECLARE
  v_yo UUID := (colab_actual()).id;
BEGIN
  RETURN QUERY
  SELECT f.id, f.informado_en, f.atleta, f.estado, f.genero,
         f.club_origen, f.club_destino, f.division_origen, f.division_destino,
         f.fuente, f.nota, f.bomba, f.visible, f.origen_envio,
         COALESCE(f.colaborador_id = v_yo, FALSE),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'id', i.id, 'texto', i.texto, 'creado_en', i.creado_en,
                    'mia', COALESCE(i.colaborador_id = v_yo, FALSE)) ORDER BY i.creado_en)
             FROM fichajes_incidencias i
            WHERE i.fichaje_id = f.id AND i.resuelta_en IS NULL
         ), '[]'::jsonb)
    FROM fichajes f
   WHERE f.visible OR f.colaborador_id = v_yo
   ORDER BY f.informado_en DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limite, 100), 1), 300);
END;
$fn$;

-- Marcar una incidencia en un fichaje publicado.
CREATE OR REPLACE FUNCTION colab_incidencia(p_fichaje UUID, p_texto TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_yo    UUID := (colab_actual()).id;
  v_texto TEXT := btrim(COALESCE(p_texto, ''));
  v_id    UUID;
  v_n     INT;
BEGIN
  IF length(v_texto) < 5 THEN
    RAISE EXCEPTION 'Cuenta en una frase qué está mal';
  END IF;
  IF length(v_texto) > 400 THEN
    RAISE EXCEPTION 'La incidencia es demasiado larga (máximo 400 caracteres)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM fichajes WHERE id = p_fichaje AND visible) THEN
    RAISE EXCEPTION 'Ese fichaje ya no está en el directo';
  END IF;
  IF EXISTS (SELECT 1 FROM fichajes_incidencias
              WHERE fichaje_id = p_fichaje AND colaborador_id = v_yo AND resuelta_en IS NULL) THEN
    RAISE EXCEPTION 'Ya has marcado una incidencia en este fichaje';
  END IF;
  SELECT COUNT(*) INTO v_n FROM fichajes_incidencias
   WHERE colaborador_id = v_yo AND creado_en > NOW() - INTERVAL '1 hour';
  IF v_n >= 30 THEN
    RAISE EXCEPTION 'Has marcado muchas incidencias en la última hora; espera un poco';
  END IF;

  INSERT INTO fichajes_incidencias (fichaje_id, colaborador_id, texto)
  VALUES (p_fichaje, v_yo, v_texto)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;

-- Corregir un fichaje MÍO: cambiar rumor ⇄ confirmado y/o retirarlo del
-- directo (para volver a publicarlo bien). Cierra sus incidencias abiertas;
-- sin cambios, solo las cierra («ya está bien»).
CREATE OR REPLACE FUNCTION colab_corregir(p_fichaje UUID, p_estado TEXT DEFAULT NULL, p_retirar BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_yo UUID := (colab_actual()).id;
BEGIN
  IF p_estado IS NOT NULL AND p_estado NOT IN ('rumor', 'confirmado') THEN
    RAISE EXCEPTION 'El estado tiene que ser rumor o confirmado';
  END IF;
  UPDATE fichajes
     SET estado  = COALESCE(p_estado, estado),
         visible = CASE WHEN COALESCE(p_retirar, FALSE) THEN FALSE ELSE visible END
   WHERE id = p_fichaje AND colaborador_id = v_yo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo puedes corregir los fichajes que has publicado tú. Si es de otro, marca una incidencia.';
  END IF;
  UPDATE fichajes_incidencias SET resuelta_en = NOW(), resuelta_por = 'autor'
   WHERE fichaje_id = p_fichaje AND resuelta_en IS NULL;
END;
$fn$;

-- Chivatazos por revisar. Sin el contacto: eso solo lo ves tú.
CREATE OR REPLACE FUNCTION colab_chivatazos()
RETURNS TABLE (
  id UUID, creado_en TIMESTAMPTZ, atleta TEXT, genero TEXT,
  club_origen TEXT, club_destino TEXT, division_origen TEXT, division_destino TEXT,
  nota TEXT, fuente TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
#variable_conflict use_column
BEGIN
  PERFORM colab_actual();
  RETURN QUERY
  SELECT p.id, p.creado_en, p.atleta, p.genero, p.club_origen, p.club_destino,
         p.division_origen, p.division_destino, p.nota, p.fuente
    FROM fichajes_propuestas p
   WHERE p.tipo = 'chivatazo' AND p.descartada_en IS NULL
   ORDER BY p.creado_en ASC
   LIMIT 200;
END;
$fn$;

-- Resolver un chivatazo: 'confirmado' o 'rumor' lo publican (queda apuntado
-- quién lo aprobó); 'descartar' lo quita de la cola de los colaboradores.
CREATE OR REPLACE FUNCTION colab_chivatazo_resolver(p_id UUID, p_accion TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_yo   UUID := (colab_actual()).id;
  v_prop fichajes_propuestas%ROWTYPE;
  v_id   UUID;
BEGIN
  IF COALESCE(p_accion, '') NOT IN ('confirmado', 'rumor', 'descartar') THEN
    RAISE EXCEPTION 'Acción no válida';
  END IF;
  SELECT * INTO v_prop FROM fichajes_propuestas
   WHERE id = p_id AND tipo = 'chivatazo' AND descartada_en IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ese chivatazo ya lo ha revisado otra persona';
  END IF;

  IF p_accion = 'descartar' THEN
    UPDATE fichajes_propuestas SET descartada_en = NOW(), descartada_por = v_yo WHERE id = p_id;
    RETURN NULL;
  END IF;

  INSERT INTO fichajes (
    informado_en, atleta, estado, genero, club_origen, club_destino,
    division_origen, division_destino, nota, fuente, origen_envio, colaborador_id
  ) VALUES (
    v_prop.creado_en, v_prop.atleta, p_accion, v_prop.genero,
    v_prop.club_origen, v_prop.club_destino,
    v_prop.division_origen, v_prop.division_destino, v_prop.nota, v_prop.fuente,
    'chivatazo', v_yo
  )
  RETURNING id INTO v_id;

  DELETE FROM fichajes_propuestas WHERE id = p_id;
  UPDATE fichajes_colaboradores SET ultimo_envio_en = NOW() WHERE id = v_yo;
  RETURN v_id;
END;
$fn$;

REVOKE ALL ON FUNCTION colab_yo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_publicar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_fichajes(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_incidencia(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_corregir(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_chivatazos() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION colab_chivatazo_resolver(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION colab_yo() TO authenticated;
GRANT EXECUTE ON FUNCTION colab_publicar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION colab_fichajes(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION colab_incidencia(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION colab_corregir(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION colab_chivatazos() TO authenticated;
GRANT EXECUTE ON FUNCTION colab_chivatazo_resolver(UUID, TEXT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6a-bis. LISTA BLANCA DE CUENTAS (v5) — hook «Before User Created»
-- ═════════════════════════════════════════════════════════════════════════════
-- Con Google, cualquiera podría crearse una cuenta (sin permisos, pero ahí
-- estaría). Este hook lo corta de raíz: Supabase Auth lo llama ANTES de crear
-- una cuenta y solo deja pasar los correos de `admins` o de un colaborador
-- activo. Hay que activarlo a mano una vez:
--   Dashboard > Authentication > Hooks > Before User Created > Postgres >
--   schema `public`, función `hook_lista_blanca`.
-- Aunque no lo actives, una cuenta que no esté en las listas no puede hacer nada.

CREATE OR REPLACE FUNCTION hook_lista_blanca(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(event->'user'->>'email', '')));
BEGIN
  IF v_email <> '' AND (
       EXISTS (SELECT 1 FROM admins WHERE email = v_email)
    OR EXISTS (SELECT 1 FROM fichajes_colaboradores WHERE email = v_email AND activo)
  ) THEN
    RETURN '{}'::jsonb;
  END IF;
  RETURN jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Este correo no tiene acceso. Pide a lanedata que lo dé de alta.'));
END;
$fn$;

REVOKE ALL ON FUNCTION hook_lista_blanca(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION hook_lista_blanca(JSONB) TO supabase_auth_admin;


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
-- v5: la web quita el fondo liso de los escudos; true = mantenerlo.
ALTER TABLE clubes_estilo ADD COLUMN IF NOT EXISTS logo_fondo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE clubes_estilo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_clubes_estilo" ON clubes_estilo;
CREATE POLICY "public_read_clubes_estilo" ON clubes_estilo FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "auth_full_clubes_estilo" ON clubes_estilo;
CREATE POLICY "auth_full_clubes_estilo" ON clubes_estilo FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

INSERT INTO storage.buckets (id, name, public) VALUES ('clubes', 'clubes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_clubes" ON storage.objects;
CREATE POLICY "public_read_clubes" ON storage.objects FOR SELECT USING (bucket_id = 'clubes');
DROP POLICY IF EXISTS "auth_insert_clubes" ON storage.objects;
CREATE POLICY "auth_insert_clubes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clubes' AND es_admin());
DROP POLICY IF EXISTS "auth_update_clubes" ON storage.objects;
CREATE POLICY "auth_update_clubes" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'clubes' AND es_admin());
DROP POLICY IF EXISTS "auth_delete_clubes" ON storage.objects;
CREATE POLICY "auth_delete_clubes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'clubes' AND es_admin());


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
CREATE POLICY "auth_full_web_ajustes" ON web_ajustes FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

INSERT INTO web_ajustes (clave, valor) VALUES ('mercado_portada', '{"posicion": "oculto"}')
ON CONFLICT (clave) DO NOTHING;
-- v4: el tablón se coloca en la portada por separado de los últimos fichajes.
INSERT INTO web_ajustes (clave, valor) VALUES ('tablon_portada', '{"posicion": "oculto"}')
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

-- v4: «qué busco» y «qué ofrezco» por separado, ambos opcionales. `texto`
-- queda como resumen de los dos (lo usan los avisos al móvil y el admin).
ALTER TABLE mercado_anuncios ADD COLUMN IF NOT EXISTS busca  TEXT CHECK (busca  IS NULL OR length(busca)  <= 800);
ALTER TABLE mercado_anuncios ADD COLUMN IF NOT EXISTS ofrece TEXT CHECK (ofrece IS NULL OR length(ofrece) <= 800);
ALTER TABLE mercado_anuncios DROP CONSTRAINT IF EXISTS mercado_anuncios_texto_check;
ALTER TABLE mercado_anuncios ADD CONSTRAINT mercado_anuncios_texto_check CHECK (length(texto) <= 1800);
ALTER TABLE mercado_anuncios DROP CONSTRAINT IF EXISTS mercado_anuncios_pruebas_check;
ALTER TABLE mercado_anuncios ADD CONSTRAINT mercado_anuncios_pruebas_check CHECK (pruebas IS NULL OR length(pruebas) <= 400);

ALTER TABLE mercado_anuncios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_anuncios" ON mercado_anuncios;
CREATE POLICY "public_read_anuncios" ON mercado_anuncios FOR SELECT TO anon USING (estado = 'publicado');
DROP POLICY IF EXISTS "auth_full_anuncios" ON mercado_anuncios;
CREATE POLICY "auth_full_anuncios" ON mercado_anuncios FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());
-- anon solo puede leer estas columnas (el contacto no está).
REVOKE ALL ON TABLE mercado_anuncios FROM anon;
GRANT SELECT (id, publicado_en, tipo, estado, autor, club_actual, genero, pruebas, zona, texto, busca, ofrece, perfil_url)
  ON mercado_anuncios TO anon;

-- v5: lo mismo, como vista, para que el tablón se vea igual con sesión iniciada
-- (un colaborador no es admin y la política de arriba es solo para anon).
CREATE OR REPLACE VIEW mercado_anuncios_publicos AS
  SELECT id, publicado_en, tipo, estado, autor, club_actual, genero, pruebas, zona, texto, busca, ofrece, perfil_url
    FROM mercado_anuncios WHERE estado = 'publicado';
GRANT SELECT ON mercado_anuncios_publicos TO anon, authenticated;

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
CREATE POLICY "auth_full_interesados" ON mercado_interesados FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- v4: la firma cambia (busca/ofrece en vez de texto); se quita la antigua.
DROP FUNCTION IF EXISTS mercado_anunciar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION mercado_anunciar(
  p_tipo TEXT, p_autor TEXT,
  p_busca TEXT DEFAULT NULL, p_ofrece TEXT DEFAULT NULL,
  p_club_actual TEXT DEFAULT NULL, p_genero TEXT DEFAULT NULL, p_pruebas TEXT DEFAULT NULL,
  p_zona TEXT DEFAULT NULL, p_perfil_url TEXT DEFAULT NULL, p_contacto TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id     UUID;
  v_n      INT;
  v_busca  TEXT := NULLIF(btrim(COALESCE(p_busca, '')), '');
  v_ofrece TEXT := NULLIF(btrim(COALESCE(p_ofrece, '')), '');
  v_prue   TEXT := NULLIF(btrim(COALESCE(p_pruebas, '')), '');
BEGIN
  IF p_tipo NOT IN ('atleta', 'club') THEN RAISE EXCEPTION 'Tipo de anuncio no válido'; END IF;
  IF length(btrim(COALESCE(p_autor, ''))) < 3 THEN RAISE EXCEPTION 'Falta el nombre'; END IF;
  IF v_busca IS NULL AND v_ofrece IS NULL AND v_prue IS NULL THEN
    RAISE EXCEPTION 'Elige al menos una prueba o cuenta qué buscas u ofreces';
  END IF;
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

  INSERT INTO mercado_anuncios (tipo, autor, busca, ofrece, texto, club_actual, genero, pruebas, zona, perfil_url, contacto)
  VALUES (p_tipo, btrim(p_autor), v_busca, v_ofrece,
          concat_ws(chr(10), 'Busca: ' || v_busca, 'Ofrece: ' || v_ofrece, CASE WHEN v_busca IS NULL AND v_ofrece IS NULL THEN v_prue END),
          NULLIF(btrim(COALESCE(p_club_actual, '')), ''), NULLIF(p_genero, ''),
          v_prue, NULLIF(btrim(COALESCE(p_zona, '')), ''),
          NULLIF(btrim(COALESCE(p_perfil_url, '')), ''), btrim(p_contacto))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION mercado_anunciar(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

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
CREATE POLICY "auth_full_push" ON push_suscripciones FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

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
  PERFORM exigir_admin();
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
  -- La fila como JSON: este trigger lo comparten cinco tablas con columnas
  -- distintas, y acceder a NEW.<columna> que no existe en una de ellas hace
  -- fallar el INSERT entero («record "new" has no field …»).
  v_fila JSONB := to_jsonb(NEW);
BEGIN
  -- Todo va dentro de un bloque con EXCEPTION: pase lo que pase, un aviso
  -- perdido nunca debe tumbar un envío.
  BEGIN
    -- Lo que apruebas tú mismo no te avisa.
    -- (Sí avisa lo que publica o aprueba un colaborador.)
    IF TG_TABLE_NAME = 'fichajes' AND COALESCE(v_fila->>'origen_envio', '') <> 'colaborador'
       AND v_fila->>'colaborador_id' IS NULL THEN
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
DROP TRIGGER IF EXISTS avisos_incidencias ON fichajes_incidencias;
CREATE TRIGGER avisos_incidencias AFTER INSERT ON fichajes_incidencias FOR EACH ROW EXECUTE FUNCTION avisos_disparar();
DROP TRIGGER IF EXISTS avisos_anuncios ON mercado_anuncios;
CREATE TRIGGER avisos_anuncios AFTER INSERT ON mercado_anuncios FOR EACH ROW EXECUTE FUNCTION avisos_disparar();
DROP TRIGGER IF EXISTS avisos_interesados ON mercado_interesados;
CREATE TRIGGER avisos_interesados AFTER INSERT ON mercado_interesados FOR EACH ROW EXECUTE FUNCTION avisos_disparar();


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. LIMPIEZA (la sección es temporal)
-- ═════════════════════════════════════════════════════════════════════════════
-- Cuando el mercado se cierre y quites la sección, para borrarlo todo:
--     DROP FUNCTION IF EXISTS fichajes_aprobar(UUID, TEXT);
--     DROP FUNCTION IF EXISTS fichajes_proponer(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS colab_yo(), colab_actual(), colab_fichajes(INT), colab_chivatazos(),
--       colab_incidencia(UUID,TEXT), colab_corregir(UUID,TEXT,BOOLEAN), colab_chivatazo_resolver(UUID,TEXT),
--       colab_publicar(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT);
--     DROP VIEW IF EXISTS mercado_anuncios_publicos;
--     DROP TABLE IF EXISTS fichajes_incidencias;
--     DROP TABLE IF EXISTS mercado_interesados, mercado_anuncios, push_suscripciones,
--       avisos_config, clubes_estilo, web_ajustes;
--     DROP FUNCTION IF EXISTS mercado_anunciar(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS mercado_interes(UUID,TEXT,TEXT,TEXT);
--     DROP FUNCTION IF EXISTS avisos_disparar() CASCADE;
--     DROP FUNCTION IF EXISTS avisos_configurar(TEXT);
--     DROP TABLE IF EXISTS fichajes_propuestas;
--     DROP TABLE IF EXISTS fichajes;
--     DROP TABLE IF EXISTS fichajes_colaboradores;
