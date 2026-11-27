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

// Cada ficha se guarda también en el navegador 24 h: volver a abrirla (o
// recargar la página) no vuelve a llamar a la función.
const LS = 'ld-ficha:'
const DIA = 24 * 60 * 60 * 1000

function deLocal(k: string): Ficha | null {
  try {
    const v = JSON.parse(localStorage.getItem(LS + k) ?? 'null') as { t: number; f: Ficha } | null
    return v && Date.now() - v.t < DIA ? v.f : null
  } catch { return null }
}
function aLocal(k: string, f: Ficha) {
  try { localStorage.setItem(LS + k, JSON.stringify({ t: Date.now(), f })) } catch { /* lleno o privado */ }
}

export function cargarFicha(nombre: string, club?: string | null): Promise<Ficha | null> {
  const k = `${nombre}|${club ?? ''}`.toLowerCase()
  let p = cache.get(k)
  if (!p) {
    const local = deLocal(k)
    if (local) {
      p = Promise.resolve(local)
    } else {
      const q = new URLSearchParams({ nombre })
      if (club) q.set('club', club)
      p = fetch(`${URL_FN}?${q}`, { headers: { Authorization: `Bearer ${KEY}`, apikey: KEY } })
        .then((r) => (r.ok ? (r.json() as Promise<Ficha>) : null))
        .then((f) => { if (f) aLocal(k, f); return f })
        .catch(() => null)
    }
    cache.set(k, p)
  }
  return p
}

/** "60m · PC" → etiqueta corta del entorno. */
export const ENTORNO: Record<string, string> = { AL: 'aire libre', PC: 'pista cubierta', RT: 'ruta' }
