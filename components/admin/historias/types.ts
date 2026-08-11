// Modelo de datos del generador de historias (1080×1920).

export const STORY_W = 1080
export const STORY_H = 1920

/** Mínimas que caben en una tarjeta antes de partir en una segunda. */
export const MINIMA_PER_CARD = 6

export interface Cover {
  kicker: string
  kicker2: string
  t1: string
  t2: string
  pill: string
  year: string
}

export interface SectionHead {
  kicker: string
  t1: string
  t2: string
}

export interface RecordRow {
  cat: string
  name: string
  meta: string
  mark: string
  tag: string
}

export interface Top5Row {
  n: string
  name: string
  meta: string
  mark: string
  pts: string
}

export interface MinimaRow {
  name: string
  event: string
  mark: string
  tag: string
}

export interface Feat {
  id: string
  pillGreen: string
  pillOutline: string
  event: string
  cat: string
  first: string
  last: string
  sub: string
  mark: string
  where: string
  g: number
  s: number
  b: number
  s2l: string
  s2v: string
  s3l: string
  s3v: string
  /** URL o data: URI de la foto, si viene del CSV. */
  foto?: string
}

export interface StoryData {
  fecha: string
  cover: Cover
  secRecords: SectionHead
  secTop5: SectionHead
  secMinima: SectionHead
  records: RecordRow[]
  top5: Top5Row[]
  minima: MinimaRow[]
  feats: Feat[]
}

/** Encuadre de la foto de un destacado: desplazamiento y zoom. */
export interface Photo {
  src: string | null
  x: number
  y: number
  z: number
}

/** El tamaño del apellido baja según lo largo que sea, para que quepa. */
export function lastNameSize(last: string): string {
  const n = String(last || '').length
  if (n <= 6) return '108px'
  if (n <= 9) return '98px'
  if (n <= 12) return '82px'
  return '68px'
}

/** Reparte las mínimas en tarjetas de MINIMA_PER_CARD filas. */
export function minimaCards(rows: MinimaRow[]): { id: string; idx: string; rows: MinimaRow[] }[] {
  const total = Math.max(1, Math.ceil(rows.length / MINIMA_PER_CARD))
  return Array.from({ length: total }, (_, i) => ({
    id: `minima${i + 1}`,
    idx: `${i + 1} / ${total}`,
    rows: rows.slice(i * MINIMA_PER_CARD, (i + 1) * MINIMA_PER_CARD),
  }))
}
