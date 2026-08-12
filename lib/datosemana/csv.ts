// Lectura del CSV de "El Dato de la Semana" y selección de la semana activa.
//
// El CSV vive en /public/dato-semana.csv. La web lo descarga en cliente, elige
// el dato de la semana en curso (visible desde el miércoles) y lo pinta. Desde
// el admin se carga el mismo CSV para generar la story.

import type { DatoSemana } from './types'

export const COLUMNS = [
  'desde', 'hasta', 'publicar', 'kicker', 'titular', 'contexto',
  'destacado', 'destacado_label', 'anio', 'fecha_historica', 'categoria',
  'fuente', 'foto', 'variante',
] as const

const DEFAULT_KICKER = 'El dato de la semana'
const DEFAULT_FUENTE = 'mundo atletismo'

/** Parte el CSV en filas. Acepta `;` o `,` y respeta las comillas dobles. */
function splitCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] || ''
  const sep = firstLine.split(';').length > firstLine.split(',').length ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c === '\r') { /* se ignora */ }
    else cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

/** Convierte una fila del CSV en un DatoSemana, con valores por defecto. */
export function parseCsv(text: string): DatoSemana[] {
  const rows = splitCsv(text)
  if (!rows.length) return []

  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/^﻿/, ''))
  const get = (r: string[], k: string) => {
    const i = head.indexOf(k)
    return i >= 0 && r[i] != null ? String(r[i]).trim() : ''
  }

  const out: DatoSemana[] = []
  rows.slice(1).forEach((r) => {
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
      fuente: get(r, 'fuente') || DEFAULT_FUENTE,
      foto: get(r, 'foto') || undefined,
      variante,
    })
  })
  return out
}

/** Fecha (a medianoche local) en la que un dato pasa a estar visible. */
function goLiveDate(d: DatoSemana): Date | null {
  if (d.publicar) return parseDate(d.publicar)
  const from = parseDate(d.desde)
  if (!from) return null
  from.setDate(from.getDate() + 2) // miércoles de esa semana
  return from
}

function parseDate(s?: string): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * Devuelve el dato activo para `now`: el más reciente cuya fecha de publicación
 * (miércoles de su semana, o `publicar`) ya haya pasado. Así el dato nuevo
 * aparece automáticamente el miércoles. Si ninguno ha llegado aún, devuelve el
 * más antiguo (para no dejar la columna vacía en la primera semana).
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
