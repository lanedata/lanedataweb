// Últimos fichajes — tipos y helpers del directo temporal de /test.
//
// Un fichaje puede tener una INCÓGNITA: se sabe que el atleta se va de su club
// pero no a dónde (club_destino = null), o al revés (club_origen = null). El
// esquema exige conocer al menos uno de los dos.

export interface Fichaje {
  id: string
  /** Hora a la que se informó del fichaje (ISO). Es la que ordena el directo. */
  informado_en: string
  /** Nombre y apellidos. */
  atleta: string
  club_origen: string | null
  club_destino: string | null
  division: string | null
  fuente: string | null
  nota: string | null
}

/** Columnas que pide el directo (deja fuera enviado_por y visible). */
export const FICHAJE_COLUMNS =
  'id, informado_en, atleta, club_origen, club_destino, division, fuente, nota'

/** Divisiones que se ofrecen como sugerencia; el campo acepta cualquier texto. */
export const DIVISIONES = [
  'División de Honor',
  'Primera División',
  'Segunda División',
  'División de Honor Sub-20',
  'Primera División Sub-20',
  'Sin división / sin confirmar',
]

/** Qué clase de movimiento es, para pintarlo distinto. */
export type TipoFichaje = 'completo' | 'destino-incognito' | 'origen-incognito'

export function tipoDe(f: Fichaje): TipoFichaje {
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
