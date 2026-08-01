// Predicción de marcas y ritmos de entrenamiento.
//
// Dos modelos, porque ninguno es perfecto:
//  · Riegel (1981)  → T₂ = T₁ · (D₂/D₁)^1.06. Simple y sorprendentemente bueno
//    entre distancias cercanas; se queda corto al saltar de 5 km a maratón.
//  · Daniels & Gilbert (VDOT) → estima el VO₂máx equivalente de tu marca y busca
//    qué tiempo daría ese mismo VDOT en otra distancia. Base de los ritmos de
//    entrenamiento clásicos (fácil, maratón, umbral, intervalos, repeticiones).

export const RIEGEL_EXP = 1.06

/** Riegel: tiempo (s) previsto en `d2` metros a partir de `t1` s en `d1` metros. */
export function riegel(d1: number, t1: number, d2: number): number {
  return t1 * Math.pow(d2 / d1, RIEGEL_EXP)
}

/** Fracción del VO₂máx sostenible durante `minutes` minutos (Daniels & Gilbert). */
function fractionOfMax(minutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes)
  )
}

/** Coste de oxígeno (ml/kg/min) de correr a `v` metros por minuto. */
function oxygenCost(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v
}

/** Velocidad (m/min) que corresponde a un consumo dado — inversa de `oxygenCost`. */
function velocityForCost(vo2: number): number {
  // 0.000104·v² + 0.182258·v − (4.6 + vo2) = 0
  const a = 0.000104
  const b = 0.182258
  const c = -(4.6 + vo2)
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}

/** VDOT (VO₂máx equivalente) de una marca: `metres` en `seconds` segundos. */
export function vdot(metres: number, seconds: number): number {
  const minutes = seconds / 60
  if (minutes <= 0 || metres <= 0) return 0
  return oxygenCost(metres / minutes) / fractionOfMax(minutes)
}

/** Tiempo (s) previsto en `metres` para un VDOT dado. Bisección: VDOT decrece con t. */
export function timeForVdot(metres: number, target: number): number | null {
  if (!(target > 0) || !(metres > 0)) return null
  let lo = 1
  let hi = 100_000
  if (vdot(metres, lo) < target) return null // ni al límite se alcanza
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2
    if (vdot(metres, mid) > target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Ritmo (s/km) al que se corre a un porcentaje dado del VDOT. */
export function paceAtIntensity(vdotValue: number, pct: number): number {
  const v = velocityForCost(vdotValue * pct) // m/min
  return v > 0 ? 60000 / v : 0
}

export interface TrainingZone {
  id: string
  label: string
  /** Fracción del VDOT; con `pctTo` la zona es un rango. */
  pct: number
  pctTo?: number
  note: string
}

// Intensidades de Daniels en fracción del VO₂máx, calibradas contra sus tablas
// publicadas (comprobadas en VDOT 50 y 60): E 6:14-5:35, M 4:31, T 4:15,
// I 3:55 y R 3:40 por kilómetro para VDOT 50.
export const TRAINING_ZONES: TrainingZone[] = [
  { id: 'easy',      label: 'Fácil / rodaje', pct: 0.54, pctTo: 0.62, note: 'Base aeróbica: la mayor parte del volumen semanal' },
  { id: 'marathon',  label: 'Maratón',        pct: 0.816, note: 'Ritmo objetivo de maratón y tiradas largas' },
  { id: 'threshold', label: 'Umbral',         pct: 0.88,  note: 'Tempo y series largas, 20-40 min de esfuerzo' },
  { id: 'interval',  label: 'Intervalos',     pct: 0.975, note: 'VO₂máx, series de 3-5 min' },
  { id: 'rep',       label: 'Repeticiones',   pct: 1.06,  note: 'Velocidad y economía, series cortas' },
]

export interface PredictorDistance {
  id: string
  label: string
  m: number
}

export const PREDICTOR_DISTANCES: PredictorDistance[] = [
  { id: '800',  label: '800 m',         m: 800 },
  { id: '1500', label: '1500 m',        m: 1500 },
  { id: 'mile', label: 'Milla',         m: 1609.344 },
  { id: '3000', label: '3000 m',        m: 3000 },
  { id: '5000', label: '5000 m',        m: 5000 },
  { id: '10k',  label: '10 km',         m: 10000 },
  { id: '15k',  label: '15 km',         m: 15000 },
  { id: '10M',  label: '10 millas',     m: 16093.44 },
  { id: '20k',  label: '20 km',         m: 20000 },
  { id: 'hm',   label: 'Media maratón', m: 21097.5 },
  { id: '30k',  label: '30 km',         m: 30000 },
  { id: 'mar',  label: 'Maratón',       m: 42195 },
]

/** Prueba de la tabla WA equivalente a cada distancia, para poder puntuarla. */
export const PREDICTOR_TO_SCORING: Record<string, string> = {
  '800': '800m',
  '1500': '1500m',
  'mile': 'mile',
  '3000': '3000m',
  '5000': '5000m',
  '10k': '10000m',
  '15k': 'road15k',
  '10M': 'road10M',
  '20k': 'road20k',
  'hm': 'roadHM',
  '30k': 'road30k',
  'mar': 'marathon',
}
