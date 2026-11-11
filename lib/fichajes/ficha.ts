// Ficha de un atleta con datos de Mundo Atletismo, vía la Edge Function
// `ma-atleta` (supabase/functions/ma-atleta): el token de la API no sale nunca
// al navegador. Si la función no está desplegada, se devuelve null y la web
// cae al enlace/iframe generado a partir del nombre.

export interface MarcaFicha {
  prueba: string
  marca: string
  fecha: string
  lugar: string | null
  pista: string
  viento: number | null
  temporada?: string
}

export interface Ficha {
  encontrado: boolean
  nombre?: string
  club?: string | null
  categoria?: string | null
  menor?: boolean
  totalMarcas?: number | null
  ultimaTemporada?: string | null
  mejores?: MarcaFicha[]
  temporada?: MarcaFicha[]
  urlEmbed?: string
}

const URL_FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/ma-atleta`
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const cache = new Map<string, Promise<Ficha | null>>()

export function cargarFicha(nombre: string, club?: string | null): Promise<Ficha | null> {
  const k = `${nombre}|${club ?? ''}`
  let p = cache.get(k)
  if (!p) {
    const q = new URLSearchParams({ nombre })
    if (club) q.set('club', club)
    p = fetch(`${URL_FN}?${q}`, { headers: { Authorization: `Bearer ${KEY}`, apikey: KEY } })
      .then((r) => (r.ok ? (r.json() as Promise<Ficha>) : null))
      .catch(() => null)
    cache.set(k, p)
  }
  return p
}

/** "60m · PC" → etiqueta corta del entorno. */
export const ENTORNO: Record<string, string> = { AL: 'aire libre', PC: 'pista cubierta', RT: 'ruta' }
