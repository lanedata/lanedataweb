// Lectura de los CSV de LaneGames y selección de la semana en curso.
//
// Los ficheros viven en /public (test-semanal.csv y wordle-semanal.csv) y se
// descargan en cliente, como el dato de la semana. El original editable está en
// la raíz del repo; al regenerarlo hay que copiarlo también a /public, que es lo
// único que se publica en el export estático.

import { parseIsoDate, readCsv } from '@/lib/csv'
import { NIVELES } from './types'
import type {
  DificultadWordle, Marca, NivelTest, PalabraWordle, SemanaTest,
} from './types'

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Mayúsculas sin tildes ni Ñ, que es como están las soluciones del wordle. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

// ── Test ──────────────────────────────────────────────────────────────────

/** Agrupa las preguntas del CSV por semana y nivel. Descarta filas incompletas. */
export function parseTest(text: string): SemanaTest[] {
  const { rows, get } = readCsv(text)
  const porSemana = new Map<number, SemanaTest>()

  rows.forEach((r) => {
    const pregunta = get(r, 'pregunta')
    const nivel = get(r, 'nivel').toLowerCase() as NivelTest
    const semana = Number(get(r, 'semana'))
    if (!pregunta || !NIVELES.includes(nivel) || !Number.isFinite(semana)) return

    const opciones = ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'].map((k) => get(r, k))
    if (opciones.some((o) => !o)) return

    // `correcta` es la letra A–D; dentro trabajamos con el índice.
    const correcta = LETRAS.indexOf(get(r, 'correcta').toUpperCase().slice(0, 1))
    if (correcta < 0 || correcta > 3) return

    const fechaLunes = get(r, 'fecha_lunes')
    let bloque = porSemana.get(semana)
    if (!bloque) {
      bloque = { semana, fechaLunes, preguntas: { facil: [], intermedio: [], dificil: [] } }
      porSemana.set(semana, bloque)
    }

    bloque.preguntas[nivel].push({
      id: get(r, 'id') || `S${semana}-${nivel}-${bloque.preguntas[nivel].length + 1}`,
      semana,
      fechaLunes,
      nivel,
      n: Number(get(r, 'n')) || bloque.preguntas[nivel].length + 1,
      tema: get(r, 'tema'),
      pregunta,
      opciones,
      correcta,
      explicacion: get(r, 'explicacion'),
      fuente: get(r, 'fuente'),
    })
  })

  const semanas = [...porSemana.values()].sort((a, b) => a.semana - b.semana)
  semanas.forEach((s) => NIVELES.forEach((n) => s.preguntas[n].sort((a, b) => a.n - b.n)))
  // Una semana sin ningún nivel jugable no se ofrece.
  return semanas.filter((s) => NIVELES.some((n) => s.preguntas[n].length > 0))
}

// ── Wordle ────────────────────────────────────────────────────────────────

const DIFICULTADES: DificultadWordle[] = ['facil', 'media', 'dificil']

/** Una palabra por semana. Descarta filas sin solución utilizable. */
export function parseWordle(text: string): PalabraWordle[] {
  const { rows, get } = readCsv(text)
  const out: PalabraWordle[] = []

  rows.forEach((r) => {
    const solucion = normalizar(get(r, 'solucion'))
    const semana = Number(get(r, 'semana'))
    if (solucion.length < 3 || !Number.isFinite(semana)) return

    const difRaw = get(r, 'dificultad').toLowerCase() as DificultadWordle
    const pistas = ['pista_1', 'pista_2', 'pista_3'].map((k) => get(r, k)).filter(Boolean)

    out.push({
      semana,
      fechaLunes: get(r, 'fecha_lunes'),
      solucion,
      longitud: solucion.length,
      letrasDistintas: new Set(solucion).size,
      dificultad: DIFICULTADES.includes(difRaw) ? difRaw : 'media',
      categoria: get(r, 'categoria'),
      intentos: Number(get(r, 'intentos')) || 6,
      pistas,
      explicacion: get(r, 'explicacion'),
    })
  })

  return out.sort((a, b) => a.semana - b.semana)
}

// ── Semana activa ─────────────────────────────────────────────────────────

/**
 * Índice de la semana en curso: la última cuyo lunes ya ha pasado. Si la tanda
 * aún no ha empezado devuelve la primera; si se ha agotado, la última (mejor
 * repetir la última semana que dejar el juego vacío).
 */
export function indiceSemanaActiva(
  items: { fechaLunes: string }[],
  now: Date = new Date(),
): number {
  if (!items.length) return -1
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  let activa = 0
  for (let i = 0; i < items.length; i++) {
    const lunes = parseIsoDate(items[i].fechaLunes)
    if (lunes && lunes.getTime() <= hoy) activa = i
    else break
  }
  return activa
}

/** "24 ago 2026" a partir de un YYYY-MM-DD. Vacío si la fecha no parsea. */
export function fechaLegible(iso: string): string {
  const d = parseIsoDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Corrección del wordle ─────────────────────────────────────────────────

/**
 * Marca cada letra del intento contra la solución, con el criterio del wordle
 * clásico: primero se fijan las correctas y sólo las letras que sobran pueden
 * quedar como "presente". Así una palabra con dos AA no pinta en amarillo la
 * segunda A si la solución sólo tiene una.
 */
export function corregir(intento: string, solucion: string): Marca[] {
  const marcas: Marca[] = Array(intento.length).fill('ausente')
  const libres = new Map<string, number>()

  for (let i = 0; i < solucion.length; i++) {
    if (intento[i] === solucion[i]) marcas[i] = 'correcta'
    else libres.set(solucion[i], (libres.get(solucion[i]) ?? 0) + 1)
  }

  for (let i = 0; i < intento.length; i++) {
    if (marcas[i] === 'correcta') continue
    const quedan = libres.get(intento[i]) ?? 0
    if (quedan > 0) {
      marcas[i] = 'presente'
      libres.set(intento[i], quedan - 1)
    }
  }

  return marcas
}

/** El mejor estado conocido de cada letra tras varios intentos, para el teclado. */
export function estadoTeclado(intentos: string[], solucion: string): Record<string, Marca> {
  const rango: Record<Marca, number> = { ausente: 0, presente: 1, correcta: 2 }
  const out: Record<string, Marca> = {}

  intentos.forEach((intento) => {
    corregir(intento, solucion).forEach((marca, i) => {
      const letra = intento[i]
      if (!out[letra] || rango[marca] > rango[out[letra]]) out[letra] = marca
    })
  })

  return out
}
