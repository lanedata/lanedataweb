// Lectura del CSV de "El Dato de la Semana" y selección de la semana activa.
//
// El CSV vive en /public/dato-semana.csv. La web lo descarga en cliente, elige
// el dato de la semana en curso (visible toda la semana lun–dom) y lo pinta.
// Desde el admin se carga el mismo CSV para generar la story.

import { parseIsoDate, readCsv } from '@/lib/csv'
import type { DatoSemana } from './types'

export const COLUMNS = [
  'desde', 'hasta', 'publicar', 'kicker', 'titular', 'contexto',
  'destacado', 'destacado_label', 'anio', 'fecha_historica', 'categoria',
  'fuente', 'foto', 'variante',
] as const

const DEFAULT_KICKER = 'El dato de la semana'

/** Convierte una fila del CSV en un DatoSemana, con valores por defecto. */
export function parseCsv(text: string): DatoSemana[] {
  const { rows, get } = readCsv(text)
  if (!rows.length) return []

  const out: DatoSemana[] = []
  rows.forEach((r) => {
    const titular = get(r, 'titular')
    if (!titular) return
    const varRaw = get(r, 'variante').toLowerCase()
    const variante = (['1', '2', '3', '4'].includes(varRaw) ? varRaw : 'auto') as DatoSemana['variante']
    out.push({
      desde: get(r, 'desde'),
      hasta: get(r, 'hasta') || undefined,
      publicar: get(r, 'publicar') || undefined,
      kicker: get(r, 'kicker') || DEFAULT_KICKER,
      titular,
      contexto: get(r, 'contexto') || undefined,
      destacado: get(r, 'destacado') || undefined,
      destacadoLabel: get(r, 'destacado_label') || undefined,
      anio: get(r, 'anio') || undefined,
      fechaHistorica: get(r, 'fecha_historica') || undefined,
      categoria: get(r, 'categoria') || undefined,
      fuente: get(r, 'fuente'),
      foto: get(r, 'foto') || undefined,
      variante,
    })
  })
  return out
}

/** Fecha (a medianoche local) en la que un dato pasa a estar visible: por
 *  defecto el lunes de su semana (`desde`), así se ve toda la semana lun–dom.
 *  Se puede adelantar/atrasar por fila con la columna `publicar`. */
function goLiveDate(d: DatoSemana): Date | null {
  if (d.publicar) return parseIsoDate(d.publicar)
  return parseIsoDate(d.desde)
}

/**
 * Devuelve el dato activo para `now`: el más reciente cuya fecha de publicación
 * (lunes de su semana, o `publicar`) ya haya pasado. Así el dato de la semana en
 * curso aparece automáticamente. Si ninguno ha llegado aún, devuelve el más
 * antiguo (para no dejar la columna vacía en la primera semana).
 */
export function pickActive(datos: DatoSemana[], now: Date = new Date()): DatoSemana | null {
  if (!datos.length) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const withLive = datos
    .map((d) => ({ d, live: goLiveDate(d) }))
    .filter((x): x is { d: DatoSemana; live: Date } => x.live != null)
    .sort((a, b) => a.live.getTime() - b.live.getTime())

  if (!withLive.length) return datos[0]

  let active = withLive[0].d
  for (const x of withLive) {
    if (x.live.getTime() <= today.getTime()) active = x.d
    else break
  }
  return active
}
