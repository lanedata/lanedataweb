// Exportación a CSV desde el panel.
//
// Pensado para abrirse en Excel español sin pelearse con él:
//   · separador `;` (Excel con configuración regional española lo espera),
//   · BOM UTF-8 al principio (si no, se comen los acentos),
//   · fechas en formato local legible, no ISO críptico.

export type CsvValue = string | number | boolean | null | undefined

export interface CsvColumn<T> {
  key: string
  header: string
  value: (row: T) => CsvValue
}

const SEP = ';'

/** Escapa una celda: comillas si hace falta, y nunca deja que Excel la ejecute. */
function cell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  let s = String(value)

  // Un valor que empieza por = + - @ lo interpretaría Excel como fórmula.
  if (/^[=+\-@]/.test(s)) s = `'${s}`

  // Los saltos de línea de un stack trace revientan la tabla si van crudos.
  s = s.replace(/\r?\n/g, ' ⏎ ')

  if (s.includes('"') || s.includes(SEP) || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.header)).join(SEP)
  const body = rows.map((r) => columns.map((c) => cell(c.value(r))).join(SEP))
  return [head, ...body].join('\r\n')
}

/** Lanza la descarga del CSV en el navegador. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Dar tiempo al navegador a empezar la descarga antes de soltar la URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "2026-08-16 14:32:07" — ordenable y legible a la vez. */
export function csvDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Sufijo de fichero con la fecha de hoy: "errores-lanedata-2026-08-16.csv" */
export function csvFilename(prefix: string): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`
}
