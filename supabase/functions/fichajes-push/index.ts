// Edge Function «fichajes-push»: manda un aviso push a tus móviles cada vez
// que entra algo en el mercado. La llama un trigger de Postgres (ver la sección
// 6e de supabase/fichajes-schema.sql) con { tabla, id } y un secreto propio.
//
//   GET  → devuelve la clave pública VAPID (la usa /admin/movil al suscribirse).
//   POST → valida el secreto, lee la fila y avisa a todas las suscripciones.
//
// Despliegue y secretos: ver supabase/functions/fichajes-push/README.md.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.49.0'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://lanedata.es'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-aviso, authorization, apikey',
}

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

interface Aviso { titulo: string; cuerpo: string; url: string; tag?: string }

const mov = (o: string | null, d: string | null) => `${o ?? '¿?'} → ${d ?? '¿?'}`

async function componer(tabla: string, id: string): Promise<Aviso | null> {
  if (tabla === 'fichajes') {
    const { data: f } = await sb.from('fichajes')
      .select('atleta, estado, origen_envio, club_origen, club_destino, colaborador_id, fichajes_colaboradores(nombre)')
      .eq('id', id).maybeSingle()
    if (!f) return null
    // deno-lint-ignore no-explicit-any
    const quien = (f as any).fichajes_colaboradores?.nombre ?? '¿?'
    const como = f.origen_envio === 'chivatazo' ? 'chivatazo aprobado por' : 'publicado por'
    return {
      titulo: `${f.estado === 'confirmado' ? '✅' : '👀'} ${f.atleta}`,
      cuerpo: `${mov(f.club_origen, f.club_destino)}\n${f.estado === 'confirmado' ? 'Confirmado' : 'Rumor'} · ${como} ${quien}`,
      url: `/admin/movil/?id=${id}`,
      tag: `f-${id}`,
    }
  }
  if (tabla === 'fichajes_propuestas') {
    const { data: p } = await sb.from('fichajes_propuestas').select('*').eq('id', id).maybeSingle()
    if (!p) return null
    const chivatazo = p.tipo === 'chivatazo'
    return {
      titulo: `${chivatazo ? '🤫 Chivatazo' : '🙋 Pendiente'}: ${p.atleta}`,
      cuerpo: `${mov(p.club_origen, p.club_destino)}\n${chivatazo ? 'Chivatazo anónimo' : 'Lo cuenta el propio atleta'} · toca para aprobar`,
      url: `/admin/movil/?p=${id}`,
      tag: `p-${id}`,
    }
  }
  if (tabla === 'fichajes_incidencias') {
    const { data: i } = await sb.from('fichajes_incidencias')
      .select('texto, fichaje_id, fichajes(atleta), fichajes_colaboradores(nombre)').eq('id', id).maybeSingle()
    if (!i) return null
    // deno-lint-ignore no-explicit-any
    const x = i as any
    return {
      titulo: `⚑ Incidencia: ${x.fichajes?.atleta ?? 'un fichaje'}`,
      cuerpo: `${String(i.texto).slice(0, 110)}\nLa marca ${x.fichajes_colaboradores?.nombre ?? 'un colaborador'}`,
      url: `/admin/movil/?id=${i.fichaje_id}`,
      tag: `i-${id}`,
    }
  }
  if (tabla === 'mercado_anuncios') {
    const { data: a } = await sb.from('mercado_anuncios').select('tipo, autor, texto').eq('id', id).maybeSingle()
    if (!a) return null
    return {
      titulo: `📌 Tablón: ${a.tipo === 'atleta' ? 'atleta busca club' : 'club busca atletas'}`,
      cuerpo: `${a.autor} · ${String(a.texto).slice(0, 90)}\nPendiente de verificar`,
      url: `/admin/movil/?a=${id}`,
    }
  }
  if (tabla === 'mercado_interesados') {
    const { data: i } = await sb.from('mercado_interesados')
      .select('nombre, mercado_anuncios(autor)').eq('id', id).maybeSingle()
    if (!i) return null
    // deno-lint-ignore no-explicit-any
    const autor = (i as any).mercado_anuncios?.autor ?? 'un anuncio'
    return { titulo: `🤝 Interesado en ${autor}`, cuerpo: `${i.nombre} quiere contactar · toca para ver`, url: '/admin/movil/#tablon' }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method === 'GET') {
    return Response.json({ publicKey: VAPID_PUBLIC || null }, { headers: cors })
  }
  if (req.method !== 'POST') return new Response('método no permitido', { status: 405, headers: cors })

  const { data: cfg } = await sb.from('avisos_config').select('secreto').eq('id', 1).maybeSingle()
  if (!cfg || req.headers.get('x-aviso') !== cfg.secreto) {
    return new Response('no autorizado', { status: 401, headers: cors })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return new Response('faltan claves VAPID', { status: 500, headers: cors })
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const { tabla, id } = await req.json().catch(() => ({}))
  const aviso = tabla && id ? await componer(tabla, id) : null
  if (!aviso) return new Response('nada que avisar', { headers: cors })

  const { data: subs } = await sb.from('push_suscripciones').select('endpoint, p256dh, auth')
  let enviados = 0
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(aviso),
        { TTL: 60 * 60 * 24, urgency: 'high' },
      )
      enviados++
    } catch (e) {
      // 404/410: el móvil ya no existe o quitó el permiso → se borra.
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await sb.from('push_suscripciones').delete().eq('endpoint', s.endpoint)
    }
  }))
  return Response.json({ enviados }, { headers: cors })
})
