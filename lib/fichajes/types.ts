// Mercado de fichajes — tipos y helpers compartidos (directo, formularios,
// panel y plantillas de historias).
//
// Un fichaje puede tener una INCÓGNITA: se sabe que el atleta deja su club pero
// no a dónde va (club_destino = null), o al revés. El esquema exige conocer al
// menos uno de los dos.

export type EstadoFichaje = 'rumor' | 'confirmado'
export type Genero = 'H' | 'M'
export type OrigenEnvio = 'colaborador' | 'atleta' | 'admin'

export interface Fichaje {
  id: string
  /** Hora a la que se informó del fichaje (ISO). Es la que ordena el directo. */
  informado_en: string
  /** Nombre y apellidos. */
  atleta: string
  estado: EstadoFichaje
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  division_origen: string | null
  division_destino: string | null
  fuente: string | null
  nota: string | null
  origen_envio: OrigenEnvio
}

/** Columnas que pide el directo público (nada privado). */
export const FICHAJE_COLUMNS =
  'id, informado_en, atleta, estado, genero, club_origen, club_destino, division_origen, division_destino, fuente, nota, origen_envio'

/** Propuesta de un atleta pendiente de aprobar (solo la ve el admin). */
export interface Propuesta {
  id: string
  creado_en: string
  atleta: string
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  division_origen: string | null
  division_destino: string | null
  nota: string | null
  contacto: string | null
}

// ─── Divisiones ──────────────────────────────────────────────────────────────

/** Código corto de clubes.json → nombre que se guarda y se muestra. */
export const DIVISION_NOMBRE = {
  DH: 'División de Honor',
  '1D': 'Primera División',
} as const
export type CodigoDivision = keyof typeof DIVISION_NOMBRE

/** Sugerencias del campo división; acepta cualquier texto. */
export const DIVISIONES = [
  DIVISION_NOMBRE.DH,
  DIVISION_NOMBRE['1D'],
  'Segunda División',
  'Sin división',
]

/** "División de Honor" → "DH", "Primera División" → "1ª". Para chips. */
export function divisionCorta(division: string | null): string | null {
  if (!division) return null
  const d = division.toLowerCase()
  if (d.includes('honor')) return 'DH'
  if (d.includes('primera')) return '1ª'
  if (d.includes('segunda')) return '2ª'
  if (d.startsWith('sin')) return null
  return division.length <= 6 ? division : null
}

export const ESTADO_ETIQUETA: Record<EstadoFichaje, string> = {
  rumor: 'Rumor',
  confirmado: 'Confirmado',
}

// ─── Clasificación y tiempos ─────────────────────────────────────────────────

export type TipoFichaje = 'completo' | 'destino-incognito' | 'origen-incognito'

export function tipoDe(f: Pick<Fichaje, 'club_origen' | 'club_destino'>): TipoFichaje {
  if (!f.club_destino) return 'destino-incognito'
  if (!f.club_origen) return 'origen-incognito'
  return 'completo'
}

/** "14:32" en hora local. */
export function horaDe(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/** "hoy" | "ayer" | "12 sep" — para agrupar el directo por días. */
export function diaDe(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hoy = new Date()
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (mismoDia(d, hoy)) return 'hoy'
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (mismoDia(d, ayer)) return 'ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** "ahora mismo" | "hace 7 min" | "hace 3 h" | "hace 2 días". */
export function haceDe(iso: string, ahora: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const seg = Math.max(0, Math.round((ahora - t) / 1000))
  if (seg < 45) return 'ahora mismo'
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'hace 1 día' : `hace ${d} días`
}

// ─── Nombres ─────────────────────────────────────────────────────────────────

/** Minúsculas y sin tildes, para buscar sin que importe cómo se escriba. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

/**
 * Reparte un nombre completo en nombre de pila y apellidos para las historias,
 * donde van en dos tamaños. Heurística: con 4+ palabras el nombre de pila son
 * las dos primeras (María José, Juan Carlos); si no, la primera. En la tarjeta
 * el texto es editable, así que si falla se corrige a mano.
 */
export function partirNombre(completo: string): { nombre: string; apellidos: string } {
  const p = completo.trim().split(/\s+/)
  if (p.length <= 1) return { nombre: '', apellidos: p[0] ?? '' }
  const corte = p.length >= 4 ? 2 : 1
  return { nombre: p.slice(0, corte).join(' '), apellidos: p.slice(corte).join(' ') }
}
