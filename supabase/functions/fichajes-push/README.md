# Avisos push del mercado (`fichajes-push`)

Una sola vez, desde la raíz del repo (`<ref>` es el id del proyecto Supabase de
la web, el que sale en la URL del dashboard — **no** el del fantasy):

1. Genera las claves VAPID (identifican a lanedata ante Google/Apple):

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Guárdalas como secretos de la función:

   ```bash
   npx supabase secrets set --project-ref <ref> VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=https://lanedata.es
   ```

3. Despliega la función (sin JWT: se protege con su propio secreto):

   ```bash
   npx supabase functions deploy fichajes-push --project-ref <ref> --no-verify-jwt
   ```

4. Relanza `supabase/fichajes-schema.sql` en el SQL Editor (crea las tablas y
   el trigger que llama a la función).

5. En el móvil: abre `lanedata.es/admin/movil/`, inicia sesión, «Añadir a
   pantalla de inicio» (en iPhone es obligatorio para tener avisos, iOS 16.4+),
   abre la app instalada y pulsa **Activar avisos**. Repite en cada dispositivo.

Si algo falla, el envío de fichajes nunca se ve afectado: el trigger ignora
los errores. Logs: Dashboard → Edge Functions → fichajes-push → Logs.
