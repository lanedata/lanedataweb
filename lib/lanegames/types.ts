// Modelo de LaneGames: el test y el wordle semanales.
//
// Las dos tandas salen de sendos CSV generados en scripts/ (ver
// docs/juegos-semanales.md). Cada fila lleva su `fecha_lunes`: la semana en
// curso se elige por fecha, igual que "El dato de la semana".

export const NIVELES = ['facil', 'intermedio', 'dificil'] as const
export type NivelTest = (typeof NIVELES)[number]

/** Etiqueta visible y descripción de cada nivel del test. */
export const NIVEL_INFO: Record<NivelTest, { label: string; pista: string }> = {
  facil:      { label: 'Fácil',      pista: 'Reglamento, material y los nombres que todo el mundo conoce.' },
  intermedio: { label: 'Intermedio', pista: 'Años de los récords, sedes recientes y ranking europeo.' },
  dificil:    { label: 'Difícil',    pista: 'Marcas exactas, segundos de todos los tiempos y mínimas.' },
}

export interface PreguntaTest {
  /** Id estable del CSV, tipo `S07-DIF-3`. Sirve de key y de clave de guardado. */
  id: string
  semana: number
  /** Lunes de la semana, YYYY-MM-DD. */
  fechaLunes: string
  nivel: NivelTest
  /** Orden dentro del bloque de 8. */
  n: number
  tema: string
  pregunta: string
  /** Las cuatro opciones, ya barajadas en el generador. */
  opciones: string[]
  /** Índice (0–3) de la opción correcta. */
  correcta: number
  /** Frase que se enseña al responder. */
  explicacion: string
  /** De qué dato sale, para poder auditarla. */
  fuente: string
}

/** Las 24 preguntas de una semana, agrupadas por nivel. */
export interface SemanaTest {
  semana: number
  fechaLunes: string
  preguntas: Record<NivelTest, PreguntaTest[]>
}

export type DificultadWordle = 'facil' | 'media' | 'dificil'

export interface PalabraWordle {
  semana: number
  fechaLunes: string
  /** En mayúsculas, sin tildes ni Ñ. De 4 a 10 letras. */
  solucion: string
  longitud: number
  letrasDistintas: number
  dificultad: DificultadWordle
  categoria: string
  /** Intentos permitidos (6 en el CSV actual). */
  intentos: number
  /** Tres pistas, de vaga a casi evidente. */
  pistas: string[]
  explicacion: string
}

/** Resultado de comparar una letra con la solución. */
export type Marca = 'correcta' | 'presente' | 'ausente'
