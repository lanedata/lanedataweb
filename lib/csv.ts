// Lector de CSV compartido por las columnas y juegos que se alimentan de un
// fichero en /public (dato de la semana, test y wordle semanales).
//
// Los CSV del repo se editan en Excel en español: separador `;` y BOM UTF-8.
// Aun así se acepta `,` por si alguno se guarda desde otra herramienta.

/** Parte el CSV en filas. Acepta `;` o `,` y respeta las comillas dobles. */
export function splitCsv(text: string): string[][] {
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

export interface CsvTable {
  /** Cabeceras normalizadas: minúsculas, sin espacios y sin el BOM. */
  head: string[]
  /** Filas de datos (la cabecera ya está fuera). */
  rows: string[][]
  /** Celda por nombre de columna; '' si la columna no existe. */
  get: (row: string[], key: string) => string
}

/** Lee el CSV y devuelve las filas de datos con acceso por nombre de columna. */
export function readCsv(text: string): CsvTable {
  const all = splitCsv(text)
  if (!all.length) return { head: [], rows: [], get: () => '' }

  const head = all[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ''))
  const get = (r: string[], k: string) => {
    const i = head.indexOf(k)
    return i >= 0 && r[i] != null ? String(r[i]).trim() : ''
  }
  return { head, rows: all.slice(1), get }
}

/** Fecha (a medianoche local) de un `YYYY-MM-DD`. `null` si no lo parece. */
export function parseIsoDate(s?: string): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
