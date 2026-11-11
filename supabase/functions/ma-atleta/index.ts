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

// Caché en memoria de la instancia (los datos cambian como mucho una vez al día).
const cache = new Map<string, { t: number; body: unknown }>()
const TTL = 6 * 60 * 60 * 1000

const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim()

interface Marca { prueba: string; marca: string; fecha: string; lugar: string | null; pista: string; viento?: number | null; temporada?: string }

async function pedir(q: Record<string, string>) {
  const r = await fetch(`${API}?${new URLSearchParams(q)}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  return { status: r.status, data: await r.json().catch(() => null) }
}

/** Prueba los cortes nombre/apellidos posibles (1 o 2 palabras de nombre). */
async function buscar(completo: string, club: string | null) {
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
  const hit = cache.get(clave)
  const cabeceras = { ...cors, 'Cache-Control': 'public, max-age=3600, s-maxage=21600' }
  if (hit && Date.now() - hit.t < TTL) return Response.json(hit.body, { headers: cabeceras })

  let body: unknown
  try {
    const d = await buscar(nombre, club)
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
    return Response.json({ error: 'Mundo Atletismo no responde' }, { status: 502, headers: cors })
  }
  cache.set(clave, { t: Date.now(), body })
  return Response.json(body, { headers: cabeceras })
})
