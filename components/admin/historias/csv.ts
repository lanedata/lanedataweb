// Lectura y escritura del CSV de historias.
//
// Una fila por pieza. La columna `tipo` decide qué es: GLOBAL, PORTADA,
// SECCION, RECORD, TOP5, MINIMA o DESTACADO. Las columnas texto1..texto6
// significan cosas distintas según el tipo (ver COLUMNS más abajo).

import { DEFAULT_DATA } from './data'
import type { Feat, StoryData } from './types'

export const COLUMNS = [
  'tipo', 'id', 'nombre', 'apellido', 'prueba', 'categoria', 'marca',
  'pill_verde', 'pill_borde', 'oro', 'plata', 'bronce',
  'dato2_label', 'dato2_valor', 'dato3_label', 'dato3_valor', 'foto',
  'texto1', 'texto2', 'texto3', 'texto4', 'texto5', 'texto6',
] as const

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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseCsv(text: string): StoryData {
  const rows = splitCsv(text)
  if (!rows.length) throw new Error('El CSV está vacío')

  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ''))
  const get = (r: string[], k: string) => {
    const i = head.indexOf(k)
    return i >= 0 && r[i] != null ? String(r[i]).trim() : ''
  }

  const base = DEFAULT_DATA
  const d: StoryData = {
    fecha: '',
    cover: { ...base.cover },
    secRecords: { ...base.secRecords },
    secTop5: { ...base.secTop5 },
    secMinima: { ...base.secMinima },
    records: [],
    top5: [],
    minima: [],
    feats: [],
  }

  // Sólo se pisan los campos que vengan con contenido.
  const merge = <T extends object>(target: T, patch: Partial<T>) => {
    for (const [k, v] of Object.entries(patch)) {
      if (v) (target as Record<string, unknown>)[k] = v
    }
  }

  rows.slice(1).forEach((r, n) => {
    const tipo = get(r, 'tipo').toUpperCase()

    if (tipo === 'GLOBAL') {
      d.fecha = get(r, 'texto1') || d.fecha
    } else if (tipo === 'PORTADA') {
      merge(d.cover, {
        kicker: get(r, 'texto1'), kicker2: get(r, 'texto2'),
        t1: get(r, 'texto3'), t2: get(r, 'texto4'),
        pill: get(r, 'texto5'), year: get(r, 'texto6'),
      })
    } else if (tipo === 'SECCION') {
      const key = get(r, 'id').toLowerCase()
      const v = { kicker: get(r, 'texto1'), t1: get(r, 'texto2'), t2: get(r, 'texto3') }
      if (key === 'records') merge(d.secRecords, v)
      else if (key === 'top5') merge(d.secTop5, v)
      else if (key === 'minima' || key === 'minimas') merge(d.secMinima, v)
    } else if (tipo === 'RECORD') {
      d.records.push({
        cat: get(r, 'categoria'), name: get(r, 'nombre'),
        meta: get(r, 'texto1'), mark: get(r, 'marca'), tag: get(r, 'texto2'),
      })
    } else if (tipo === 'TOP5') {
      d.top5.push({
        n: String(d.top5.length + 1), name: get(r, 'nombre'),
        meta: get(r, 'texto1'), mark: get(r, 'marca'), pts: get(r, 'texto2'),
      })
    } else if (tipo === 'MINIMA') {
      d.minima.push({
        name: get(r, 'nombre'), event: get(r, 'prueba'),
        mark: get(r, 'marca'), tag: get(r, 'texto2'),
      })
    } else if (tipo === 'DESTACADO') {
      const nom = get(r, 'nombre')
      const ape = get(r, 'apellido')
      const num = (k: string) => Number(get(r, k) || '0') || 0
      const feat: Feat = {
        id: get(r, 'id') || slugify(`${nom}-${ape}`) || `dest-${n}`,
        pillGreen: get(r, 'pill_verde'), pillOutline: get(r, 'pill_borde'),
        event: get(r, 'prueba'), cat: get(r, 'categoria'),
        first: nom, last: ape, sub: get(r, 'texto1'),
        mark: get(r, 'marca'), where: get(r, 'texto2'),
        g: num('oro'), s: num('plata'), b: num('bronce'),
        s2l: get(r, 'dato2_label'), s2v: get(r, 'dato2_valor'),
        s3l: get(r, 'dato3_label'), s3v: get(r, 'dato3_valor'),
      }
      const foto = get(r, 'foto')
      if (foto) feat.foto = foto
      d.feats.push(feat)
    }
  })

  if (!d.fecha) d.fecha = base.fecha
  return d
}

/** Serializa los datos actuales como CSV, para usarlo de plantilla. */
export function toCsv(d: StoryData): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const line = (o: Record<string, unknown>) => COLUMNS.map((h) => esc(o[h])).join(';')

  const out = [COLUMNS.join(';')]
  out.push(line({ tipo: 'GLOBAL', texto1: d.fecha }))
  out.push(line({
    tipo: 'PORTADA', texto1: d.cover.kicker, texto2: d.cover.kicker2,
    texto3: d.cover.t1, texto4: d.cover.t2, texto5: d.cover.pill, texto6: d.cover.year,
  }))
  const sec = (id: string, s: { kicker: string; t1: string; t2: string }) =>
    line({ tipo: 'SECCION', id, texto1: s.kicker, texto2: s.t1, texto3: s.t2 })
  out.push(sec('records', d.secRecords))
  out.push(sec('top5', d.secTop5))
  out.push(sec('minima', d.secMinima))

  d.records.forEach((r) => out.push(line({
    tipo: 'RECORD', categoria: r.cat, nombre: r.name, texto1: r.meta, marca: r.mark, texto2: r.tag,
  })))
  d.top5.forEach((t) => out.push(line({
    tipo: 'TOP5', nombre: t.name, texto1: t.meta, marca: t.mark, texto2: t.pts,
  })))
  d.minima.forEach((m) => out.push(line({
    tipo: 'MINIMA', nombre: m.name, prueba: m.event, marca: m.mark, texto2: m.tag,
  })))
  d.feats.forEach((f) => out.push(line({
    tipo: 'DESTACADO', id: f.id, nombre: f.first, apellido: f.last, prueba: f.event,
    categoria: f.cat, marca: f.mark, pill_verde: f.pillGreen, pill_borde: f.pillOutline,
    oro: f.g, plata: f.s, bronce: f.b,
    dato2_label: f.s2l, dato2_valor: f.s2v, dato3_label: f.s3l, dato3_valor: f.s3v,
    texto1: f.sub, texto2: f.where,
  })))

  return out.join('\n')
}
