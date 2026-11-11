# Fichas de Mundo Atletismo (`ma-atleta`)

Intermediario entre la web (estática) y la API de Mundo Atletismo. El token
**nunca** va en el código ni en el repo: se guarda como secreto de Supabase.

Una sola vez, desde la raíz del repo (`<ref>` = proyecto Supabase de la web):

```bash
npx supabase secrets set --project-ref <ref> MA_API_TOKEN=<token de Mundo Atletismo>
```

```bash
npx supabase functions deploy ma-atleta --project-ref <ref>
```

(Con verificación JWT: la web la llama con la anon key, como al resto de Supabase.)

Qué hace: busca al atleta por nombre (y club para desempatar homónimos), quita
siempre la fecha de nacimiento y, si es menor de 18, no devuelve marcas, solo
el enlace a su ficha. Cachea 6 h por instancia.

Si se cambia el token: vuelve a lanzar el `secrets set`; no hace falta redesplegar.
