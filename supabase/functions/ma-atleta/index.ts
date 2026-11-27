// Edge Function «ma-atleta»: intermediario entre lanedata (web estática) y la
// API de Mundo Atletismo. Existe por tres motivos:
//   · el token de la API no puede ir en el JavaScript público: vive aquí como
//     secreto (MA_API_TOKEN);
//   · la API no tiene CORS para lanedata.es;
//   · la API devuelve la fecha de nacimiento completa: aquí se quita siempre,
//     y de los menores de 18 no se devuelve ninguna marca.
//
//   GET ?nombre=<nombre y apellidos>&club=<club opcional>
//   → { encontrado, nombre, club, categoria, sexo, mejores: [...], temporada: [...], urlEmbed }
//
// Despliegue: ver supabase/functions/ma-atleta/README.md.

const API = 'https://mundoatletismo.es/api/v1/atleta'
const TOKEN = Deno.env.get('MA_API_TOKEN') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

// Cada llamada a la API de Mundo Atletismo cuenta. Tres niveles de caché:
//   1. memoria de la instancia;
//   2. tabla `ma_fichas` en Supabase (sobrevive a reinicios y es común a
//      todas las instancias): 7 días, o 1 día si no se encontró al atleta;
//   3. el slug exacto guardado allí: al refrescar, 1 sola llamada en vez de
//      probar cortes de nombre (hasta 3).
// Además el navegador guarda cada ficha 24 h (lib/fichajes/ficha.ts).
const cache = new Map<string, { t: number; body: unknown }>()
const TTL_OK = 7 * 24 * 60 * 60 * 1000
const TTL_NO = 24 * 60 * 60 * 1000
const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ttlDe = (body: unknown) => ((body as { encontrado?: boolean })?.encontrado ? TTL_OK : TTL_NO)

async function leerTabla(clave: string): Promise<{ body: unknown; slug: string | null; t: number } | null> {
  if (!SB_URL || !SB_KEY) return null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/ma_fichas?clave=eq.${encodeURIComponent(clave)}&select=body,slug,actualizado_en`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })
    const [fila] = r.ok ? await r.json() : []
    return fila ? { body: fila.body, slug: fila.slug, t: Date.parse(fila.actualizado_en) } : null
  } catch { return null }
}

async function guardarTabla(clave: string, body: unknown, slug: string | null) {
  if (!SB_URL || !SB_KEY) return
  await fetch(`${SB_URL}/rest/v1/ma_fichas?on_conflict=clave`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ clave, body, slug, actualizado_en: new Date().toISOString() }),
  }).catch(() => {})
}

const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim()

interface Marca { prueba: string; marca: string; fecha: string; lugar: string | null; pista: string; viento?: number | null; temporada?: string }

async function pedir(q: Record<string, string>) {
  const r = await fetch(`${API}?${new URLSearchParams(q)}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  return { status: r.status, data: await r.json().catch(() => null) }
}

/** Prueba los cortes nombre/apellidos posibles (1 o 2 palabras de nombre). */
async function buscar(completo: string, club: string | null, slug: string | null) {
  if (slug) {
    const r = await pedir({ slug })
    if (r.status === 200 && r.data?.atleta) return r.data
  }
  const p = completo.trim().split(/\s+/)
  const cortes = p.length >= 4 ? [2, 1] : [1, 2].filter((c) => c < p.length)
  for (const c of cortes) {
    const { status, data } = await pedir({ nombre: p.slice(0, c).join(' '), apellidos: p.slice(c).join(' ') })
    if (status === 200 && data?.atleta) return data
    if (data?.error?.code === 'AMBIGUO' && Array.isArray(data.candidatos)) {
      const cands = data.candidatos as { slug: string; clubActual?: string; totalMarcas?: number }[]
      const delClub = club ? cands.filter((x) => norm(x.clubActual ?? '') === norm(club)) : []
      const elegido = (delClub.length ? delClub : cands).sort((a, b) => (b.totalMarcas ?? 0) - (a.totalMarcas ?? 0))[0]
      if (elegido) {
        const r = await pedir({ slug: elegido.slug })
        if (r.status === 200 && r.data?.atleta) return r.data
      }
    }
  }
  return null
}

/** Una marca por prueba y entorno, las más recientes primero. */
function limpiar(lista: Marca[] | undefined, max: number) {
  const vistos = new Set<string>()
  return (lista ?? [])
    .slice()
    .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
    .filter((m) => { const k = `${m.prueba}|${m.pista}`; if (vistos.has(k)) return false; vistos.add(k); return true })
    .slice(0, max)
    .map((m) => ({ prueba: m.prueba, marca: m.marca, fecha: m.fecha, lugar: m.lugar, pista: m.pista, viento: m.viento ?? null, temporada: m.temporada }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'GET') return new Response('método no permitido', { status: 405, headers: cors })
  if (!TOKEN) return Response.json({ error: 'Falta MA_API_TOKEN' }, { status: 500, headers: cors })

  const url = new URL(req.url)
  const nombre = (url.searchParams.get('nombre') ?? '').trim().slice(0, 120)
  const club = (url.searchParams.get('club') ?? '').trim().slice(0, 120) || null
  if (nombre.split(/\s+/).length < 2) return Response.json({ error: 'nombre incompleto' }, { status: 400, headers: cors })

  const clave = `${norm(nombre)}|${norm(club ?? '')}`
  const cabeceras = { ...cors, 'Cache-Control': 'public, max-age=3600, s-maxage=21600' }
  const hit = cache.get(clave)
  if (hit && Date.now() - hit.t < ttlDe(hit.body)) return Response.json(hit.body, { headers: cabeceras })

  const guardada = await leerTabla(clave)
  if (guardada && Date.now() - guardada.t < ttlDe(guardada.body)) {
    cache.set(clave, { t: guardada.t, body: guardada.body })
    return Response.json(guardada.body, { headers: cabeceras })
  }

  let body: unknown
  let slug: string | null = null
  try {
    const d = await buscar(nombre, club, guardada?.slug ?? null)
    slug = d?.atleta?.slug ?? d?.atleta?.slugFull ?? guardada?.slug ?? null
    if (!d) {
      body = { encontrado: false }
    } else {
      const a = d.atleta
      const menor = typeof a.edadActual === 'number' && a.edadActual < 18
      const q = new URLSearchParams({ skin: 'lane' })
      if (a.clubActual) q.set('club', a.clubActual)
      body = {
        encontrado: true,
        nombre: a.nombre,
        club: a.clubActual ?? null,
        categoria: a.categoriaActual ?? null,
        sexo: a.sexo ?? null,
        menor,
        totalMarcas: menor ? null : a.totalMarcas ?? null,
        ultimaTemporada: a.ultimaTemporada ?? null,
        mejores: menor ? [] : limpiar(d.personalBests, 8),
        temporada: menor ? [] : limpiar(d.seasonBests, 4),
        urlEmbed: `https://mundoatletismo.es/embed/atleta/${encodeURIComponent(a.nombre)}?${q}`,
      }
    }
  } catch {
    // Si la API falla pero hay una ficha vieja guardada, mejor eso que nada.
    if (guardada) return Response.json(guardada.body, { headers: cabeceras })
    return Response.json({ error: 'Mundo Atletismo no responde' }, { status: 502, headers: cors })
  }
  cache.set(clave, { t: Date.now(), body })
  await guardarTabla(clave, body, slug)
  return Response.json(body, { headers: cabeceras })
})
