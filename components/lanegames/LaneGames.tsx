'use client'

// LaneGames: los dos juegos semanales de lanedata, el test y el wordle.
//
// Descarga los dos CSV de /public en cliente (como la columna del dato de la
// semana) y abre la semana en curso. Mientras vive en /test lleva además un
// navegador de semanas para poder revisar cualquier tanda antes de publicarla;
// al sacarlo a la web pública, `navegable={false}` lo deja fijo en la semana
// que toque.

import { useEffect, useMemo, useState } from 'react'
import { fechaLegible, indiceSemanaActiva, parseTest, parseWordle } from '@/lib/lanegames/csv'
import type { PalabraWordle, SemanaTest } from '@/lib/lanegames/types'
import { QuizSemanal } from './QuizSemanal'
import { WordleSemanal } from './WordleSemanal'

const TEST_CSV = '/test-semanal.csv'
const WORDLE_CSV = '/wordle-semanal.csv'

type JuegoId = 'test' | 'wordle'

const JUEGOS: { id: JuegoId; nombre: string; sub: string; descripcion: string }[] = [
  {
    id: 'test',
    nombre: 'El test',
    sub: '8 preguntas · 3 niveles',
    descripcion:
      'Ocho preguntas por nivel sobre atletismo español. Las respuestas salen de los récords de España, los rankings all-time, el historial de Campeonatos y el ranking europeo: los distractores son marcas reales, no números inventados.',
  },
  {
    id: 'wordle',
    nombre: 'El wordle',
    sub: 'una palabra · 6 intentos',
    descripcion:
      'Una palabra de atletismo por semana en seis intentos, con tres pistas que se van abriendo según fallas. Sin tildes ni Ñ, de cuatro a diez letras.',
  },
]

interface Datos {
  test: SemanaTest[]
  wordle: PalabraWordle[]
}

export function LaneGames({ navegable = false }: { navegable?: boolean }) {
  const [juego, setJuego] = useState<JuegoId>('test')
  const [datos, setDatos] = useState<Datos | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [indices, setIndices] = useState<Record<JuegoId, number>>({ test: 0, wordle: 0 })

  useEffect(() => {
    let vivo = true
    const bajar = (url: string) =>
      fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))

    Promise.all([bajar(TEST_CSV), bajar(WORDLE_CSV)])
      .then(([testTxt, wordleTxt]) => {
        if (!vivo) return
        const test = parseTest(testTxt)
        const wordle = parseWordle(wordleTxt)
        if (!test.length && !wordle.length) { setEstado('error'); return }
        setDatos({ test, wordle })
        setIndices({ test: indiceSemanaActiva(test), wordle: indiceSemanaActiva(wordle) })
        setEstado('listo')
      })
      .catch(() => vivo && setEstado('error'))

    return () => { vivo = false }
  }, [])

  const activo = useMemo(() => JUEGOS.find((j) => j.id === juego)!, [juego])

  if (estado === 'cargando') {
    return <div className="h-[420px] animate-pulse border border-ink/[0.14] bg-cream/50" aria-hidden="true" />
  }
  if (estado === 'error' || !datos) {
    return (
      <p className="border border-ink/[0.14] bg-cream/40 p-8 text-center label-mono text-ink/40">
        No se han podido cargar los juegos de esta semana
      </p>
    )
  }

  const lista: { fechaLunes: string; semana: number }[] = juego === 'test' ? datos.test : datos.wordle
  const indice = Math.min(indices[juego], Math.max(lista.length - 1, 0))
  const semanaTest = datos.test[Math.min(indices.test, datos.test.length - 1)]
  const palabra = datos.wordle[Math.min(indices.wordle, datos.wordle.length - 1)]
  const hoy = indiceSemanaActiva(lista)

  function mover(paso: number) {
    setIndices((prev) => ({
      ...prev,
      [juego]: Math.min(Math.max(prev[juego] + paso, 0), lista.length - 1),
    }))
  }

  return (
    <div>
      {/* Selector de juego + semana */}
      <div className="flex flex-col gap-4 border-b border-ink/[0.14] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="Juegos de LaneGames" className="flex gap-2">
          {JUEGOS.map((j) => {
            const on = j.id === juego
            return (
              <button
                key={j.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`juego-${j.id}`}
                onClick={() => setJuego(j.id)}
                className={`border px-4 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 ${
                  on ? 'border-ink bg-ink' : 'border-ink/[0.14] bg-paper hover:border-ink/30 hover:bg-cream'
                }`}
              >
                <span className={`block font-brand text-[0.95rem] font-extrabold leading-tight tracking-tight ${on ? 'text-cream' : 'text-ink'}`}>
                  {j.nombre}
                </span>
                <span className={`mt-0.5 block font-mono text-[0.52rem] uppercase leading-tight tracking-wider ${on ? 'text-cream/50' : 'text-ink/35'}`}>
                  {j.sub}
                </span>
              </button>
            )
          })}
        </div>

        {lista.length > 0 && (
          <div className="flex items-center gap-2.5">
            {navegable && (
              <button
                type="button"
                onClick={() => mover(-1)}
                disabled={indice === 0}
                aria-label="Semana anterior"
                className="h-8 w-8 border border-ink/[0.14] bg-paper font-mono text-xs text-ink/50 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-25"
              >
                ←
              </button>
            )}
            <div className="text-right">
              <p className="label-mono text-ink/45">Semana {lista[indice].semana} de {lista.length}</p>
              <p className="mt-0.5 font-mono text-[0.58rem] tracking-[0.14em] uppercase text-ink/30">
                lunes {fechaLegible(lista[indice].fechaLunes)}
                {navegable && indice !== hoy && ' · no es la de hoy'}
              </p>
            </div>
            {navegable && (
              <button
                type="button"
                onClick={() => mover(1)}
                disabled={indice >= lista.length - 1}
                aria-label="Semana siguiente"
                className="h-8 w-8 border border-ink/[0.14] bg-paper font-mono text-xs text-ink/50 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-25"
              >
                →
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/55">{activo.descripcion}</p>

      <div className="mt-6">
        <section
          id="juego-test"
          role="tabpanel"
          aria-label="El test"
          className={juego === 'test' ? 'panel-enter' : 'hidden'}
        >
          {semanaTest
            ? <QuizSemanal key={semanaTest.semana} semana={semanaTest} />
            : <Vacio texto="No hay ninguna tanda de test en el CSV" />}
        </section>

        <section
          id="juego-wordle"
          role="tabpanel"
          aria-label="El wordle"
          className={juego === 'wordle' ? 'panel-enter' : 'hidden'}
        >
          {palabra
            ? <WordleSemanal key={palabra.semana} palabra={palabra} />
            : <Vacio texto="No hay ninguna palabra en el CSV" />}
        </section>
      </div>
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <p className="border border-ink/[0.14] bg-cream/40 p-8 text-center label-mono text-ink/40">{texto}</p>
  )
}
