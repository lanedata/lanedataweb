// Official IAAF/World Athletics combined-events scoring constants.
// Points = floor(A · (B − T)^C)        for track events  (T in seconds)
// Points = floor(A · (M − B)^C)        for jumps (M in cm) and throws (M in metres)
// Constants stable since 1985; verified against known benchmark performances.

export type SubKind = 'track' | 'jump' | 'throw'

export interface SubEvent {
  id: string
  label: string
  kind: SubKind
  /** input unit shown to the user */
  unit: 'tiempo' | 'metros'
  A: number
  B: number
  C: number
  /** example placeholder */
  ph: string
}

// ── Decathlon (men) ──
export const DECATHLON: SubEvent[] = [
  { id: '100m',  label: '100 m',            kind: 'track', unit: 'tiempo', A: 25.4347,  B: 18,   C: 1.81,  ph: '10.85' },
  { id: 'LJ',    label: 'Salto de longitud', kind: 'jump',  unit: 'metros', A: 0.14354,  B: 220,  C: 1.40,  ph: '7.40' },
  { id: 'SP',    label: 'Peso',             kind: 'throw', unit: 'metros', A: 51.39,    B: 1.5,  C: 1.05,  ph: '14.50' },
  { id: 'HJ',    label: 'Salto de altura',   kind: 'jump',  unit: 'metros', A: 0.8465,   B: 75,   C: 1.42,  ph: '2.00' },
  { id: '400m',  label: '400 m',            kind: 'track', unit: 'tiempo', A: 1.53775,  B: 82,   C: 1.81,  ph: '48.50' },
  { id: '110mH', label: '110 m vallas',      kind: 'track', unit: 'tiempo', A: 5.74352,  B: 28.5, C: 1.92,  ph: '14.50' },
  { id: 'DT',    label: 'Disco',            kind: 'throw', unit: 'metros', A: 12.91,    B: 4,    C: 1.10,  ph: '45.00' },
  { id: 'PV',    label: 'Salto con pértiga', kind: 'jump',  unit: 'metros', A: 0.2797,   B: 100,  C: 1.35,  ph: '4.90' },
  { id: 'JT',    label: 'Jabalina',         kind: 'throw', unit: 'metros', A: 10.14,    B: 7,    C: 1.08,  ph: '60.00' },
  { id: '1500m', label: '1500 m',           kind: 'track', unit: 'tiempo', A: 0.03768,  B: 480,  C: 1.85,  ph: '4:30' },
]

// ── Heptathlon (women) ──
export const HEPTATHLON: SubEvent[] = [
  { id: '100mH', label: '100 m vallas',      kind: 'track', unit: 'tiempo', A: 9.23076,  B: 26.7, C: 1.835, ph: '13.50' },
  { id: 'HJ',    label: 'Salto de altura',   kind: 'jump',  unit: 'metros', A: 1.84523,  B: 75,   C: 1.348, ph: '1.80' },
  { id: 'SP',    label: 'Peso',             kind: 'throw', unit: 'metros', A: 56.0211,  B: 1.5,  C: 1.05,  ph: '14.00' },
  { id: '200m',  label: '200 m',            kind: 'track', unit: 'tiempo', A: 4.99087,  B: 42.5, C: 1.81,  ph: '24.00' },
  { id: 'LJ',    label: 'Salto de longitud', kind: 'jump',  unit: 'metros', A: 0.188807, B: 210,  C: 1.41,  ph: '6.00' },
  { id: 'JT',    label: 'Jabalina',         kind: 'throw', unit: 'metros', A: 15.9803,  B: 3.8,  C: 1.04,  ph: '40.00' },
  { id: '800m',  label: '800 m',            kind: 'track', unit: 'tiempo', A: 0.11193,  B: 254,  C: 1.88,  ph: '2:10' },
]

/**
 * Score one sub-event.
 *  - track → `value` in seconds
 *  - jump  → `value` in metres (converted to cm internally)
 *  - throw → `value` in metres
 */
export function scoreSubEvent(ev: SubEvent, value: number): number {
  let m: number
  if (ev.kind === 'track') {
    if (value >= ev.B) return 0
    m = ev.B - value
  } else if (ev.kind === 'jump') {
    const cm = value * 100
    if (cm <= ev.B) return 0
    m = cm - ev.B
  } else {
    if (value <= ev.B) return 0
    m = value - ev.B
  }
  const p = Math.floor(ev.A * Math.pow(m, ev.C))
  return p > 0 ? p : 0
}
