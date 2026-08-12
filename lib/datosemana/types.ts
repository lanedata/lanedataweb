// Modelo de "El Dato de la Semana".
//
// Cada fila del CSV es el dato de una semana. La columna `desde` (lunes de esa
// semana, YYYY-MM-DD) fija a qué semana pertenece; el dato se ve toda esa semana
// (lun–dom) salvo que se adelante/atrase con `publicar`.
//
// El dato es deliberadamente flexible: sirve para un aniversario ("un día como
// hoy en 2012…"), una racha ("el récord lleva 18 años sin batirse") o una
// estadística de la semana histórica. Todos los campos salvo `titular` son
// opcionales, así la misma estructura se adapta a cualquier tipo de dato.

export const STORY_W = 1080
export const STORY_H = 1920

export interface DatoSemana {
  /** Lunes de la semana, YYYY-MM-DD. Ordena y selecciona la semana activa. */
  desde: string
  /** Domingo de la semana, opcional (sólo informativo). */
  hasta?: string
  /** Fecha de publicación en la web (YYYY-MM-DD). Por defecto: desde + 2 (miércoles). */
  publicar?: string

  /** Etiqueta superior. Por defecto "El dato de la semana". */
  kicker: string
  /** Titular: el dato en sí. Único campo obligatorio. */
  titular: string
  /** Contexto o subtítulo bajo el titular. */
  contexto?: string

  /** Valor grande a destacar: "2.02m", "18", "5"… Opcional. */
  destacado?: string
  /** Etiqueta del valor destacado: "AÑOS SIN BATIRSE", "ATLETAS"… */
  destacadoLabel?: string

  /** Año histórico del dato: "2012". Se pinta como marca de agua en algunas variantes. */
  anio?: string
  /** Fecha histórica legible: "12 AGO 2012", "UN DÍA COMO HOY". */
  fechaHistorica?: string
  /** Categoría/prueba: "SALTO DE ALTURA", "100 M". */
  categoria?: string

  /** Fuente del dato (ej. "mundo atletismo"). Vacío = no se muestra el "vía…". */
  fuente: string
  /** URL o data: URI de foto opcional. */
  foto?: string

  /** Variante visual: 'auto' rota según la semana; 1..4 la fuerza. */
  variante: 'auto' | '1' | '2' | '3' | '4'
}

/** Número de variantes visuales de la story. */
export const VARIANT_COUNT = 4

/** Resuelve la variante efectiva (1..VARIANT_COUNT) de un dato. */
export function resolveVariant(d: DatoSemana): number {
  if (d.variante !== 'auto') {
    const n = Number(d.variante)
    if (n >= 1 && n <= VARIANT_COUNT) return n
  }
  // 'auto': deriva de la fecha para que cada semana cambie sin repetir seguido.
  const seed = hashString(d.desde || d.titular)
  return (seed % VARIANT_COUNT) + 1
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** El tamaño del titular baja según su longitud, para que quepa. */
export function titularSize(t: string): number {
  const n = String(t || '').length
  if (n <= 40) return 92
  if (n <= 70) return 78
  if (n <= 110) return 64
  if (n <= 160) return 54
  return 46
}
