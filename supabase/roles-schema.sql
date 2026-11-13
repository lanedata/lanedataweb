-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Roles: quién es ADMIN y quién solo ha iniciado sesión
--
-- EJECUTA ESTE FICHERO ANTES de activar el inicio de sesión con Google y antes
-- de relanzar fichajes-schema.sql y telemetry-schema.sql. Es idempotente.
--
-- POR QUÉ: hasta ahora la única persona con cuenta eras tú, así que todas las
-- políticas decían «si ha iniciado sesión, puede con todo». Con Google, una
-- cuenta se la puede crear cualquiera, y eso dejaría de ser verdad: cualquiera
-- con sesión podría editar artículos, leer analíticas o borrar fichajes. Desde
-- aquí, «con todo» pasa a significar «su correo está en la tabla `admins`».
--
-- Se entra SOLO con Google (al panel y a colaboradores): no hay contraseñas
-- que adivinar. `admins` es la lista blanca del panel, por CORREO.
--
-- La primera vez se apuntan los correos de las cuentas que YA existen (las
-- tuyas). OJO: si tu cuenta de Google es OTRO correo, añádelo ahora o no podrás
-- entrar al panel con Google:
--     INSERT INTO admins (email) VALUES ('tu-cuenta@gmail.com') ON CONFLICT DO NOTHING;
-- Quitar uno:   DELETE FROM admins WHERE email = '…';
-- Ver la lista: SELECT email FROM admins;
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('public.admins') IS NULL THEN
    CREATE TABLE public.admins (
      email     TEXT PRIMARY KEY CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%'),
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    -- Solo la primera vez: quien ya tenía cuenta era admin.
    INSERT INTO public.admins (email)
      SELECT DISTINCT lower(btrim(email)) FROM auth.users WHERE email IS NOT NULL
      ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Nadie la lee ni la toca desde la web: solo `es_admin()` y el SQL Editor.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE admins FROM anon, authenticated;

-- El correo se lee de la cuenta (no de lo que diga el navegador) y solo vale si
-- está verificado; con Google lo está siempre.
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u JOIN admins a ON a.email = lower(u.email)
     WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  );
$fn$;

GRANT EXECUTE ON FUNCTION es_admin() TO anon, authenticated;

-- Para las funciones de admin: corta si quien llama desde la web no es admin.
-- Desde el SQL Editor (sin sesión de la web) se deja pasar.
CREATE OR REPLACE FUNCTION exigir_admin()
RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.role() IS NOT NULL AND NOT es_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede hacer esto' USING ERRCODE = '42501';
  END IF;
END;
$fn$;


-- ═════════════════════════════════════════════════════════════════════════════
-- Políticas de lo que ya existía: «con sesión» → «admin»
-- ═════════════════════════════════════════════════════════════════════════════
-- Cada bloque comprueba que la tabla exista, por si falta algún esquema.
-- (Las del mercado de fichajes y las funciones de analíticas se actualizan al
-- relanzar fichajes-schema.sql y telemetry-schema.sql.)

DO $$
BEGIN
  -- Artículos
  IF to_regclass('public.articles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "auth_full_access" ON articles;
    CREATE POLICY "auth_full_access" ON articles FOR ALL TO authenticated
      USING (es_admin()) WITH CHECK (es_admin());
  END IF;

  -- Competiciones
  IF to_regclass('public.competitions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "competitions_auth_insert" ON competitions;
    CREATE POLICY "competitions_auth_insert" ON competitions FOR INSERT WITH CHECK (es_admin());
    DROP POLICY IF EXISTS "competitions_auth_update" ON competitions;
    CREATE POLICY "competitions_auth_update" ON competitions FOR UPDATE USING (es_admin());
  END IF;

  -- Errores y analíticas (escribir sigue abierto; leer y borrar, solo admin)
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "auth_read_errors" ON error_logs;
    CREATE POLICY "auth_read_errors" ON error_logs FOR SELECT TO authenticated USING (es_admin());
    DROP POLICY IF EXISTS "auth_update_errors" ON error_logs;
    CREATE POLICY "auth_update_errors" ON error_logs FOR UPDATE TO authenticated
      USING (es_admin()) WITH CHECK (es_admin());
    DROP POLICY IF EXISTS "auth_delete_errors" ON error_logs;
    CREATE POLICY "auth_delete_errors" ON error_logs FOR DELETE TO authenticated USING (es_admin());
  END IF;
  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "auth_read_analytics" ON analytics_events;
    CREATE POLICY "auth_read_analytics" ON analytics_events FOR SELECT TO authenticated USING (es_admin());
    DROP POLICY IF EXISTS "auth_delete_analytics" ON analytics_events;
    CREATE POLICY "auth_delete_analytics" ON analytics_events FOR DELETE TO authenticated USING (es_admin());
  END IF;
END $$;

-- Ficheros (portadas, artículos HTML y escudos): subir y borrar, solo admin.
DROP POLICY IF EXISTS "auth_upload_covers" ON storage.objects;
CREATE POLICY "auth_upload_covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND es_admin());
DROP POLICY IF EXISTS "auth_delete_covers" ON storage.objects;
CREATE POLICY "auth_delete_covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND es_admin());

DROP POLICY IF EXISTS "auth_upload_articles" ON storage.objects;
CREATE POLICY "auth_upload_articles" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'articles' AND es_admin());
DROP POLICY IF EXISTS "auth_delete_articles" ON storage.objects;
CREATE POLICY "auth_delete_articles" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'articles' AND es_admin());

DROP POLICY IF EXISTS "auth_insert_clubes" ON storage.objects;
CREATE POLICY "auth_insert_clubes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clubes' AND es_admin());
DROP POLICY IF EXISTS "auth_update_clubes" ON storage.objects;
CREATE POLICY "auth_update_clubes" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clubes' AND es_admin());
DROP POLICY IF EXISTS "auth_delete_clubes" ON storage.objects;
CREATE POLICY "auth_delete_clubes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clubes' AND es_admin());
