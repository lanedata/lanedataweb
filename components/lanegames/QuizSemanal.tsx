'use client'

// Test semanal: 8 preguntas por nivel (fácil, intermedio y difícil), una a una,
// con corrección inmediata y la explicación del dato al responder.
//
// Las preguntas salen de /test-semanal.csv y las opciones ya vienen barajadas
// del generador: aquí no se toca el orden, así el id de cada pregunta sigue
// apuntando a lo mismo y la partida guardada se puede recuperar.

import { useMemo, useState } from 'react'
import { NIVELES, NIVEL_INFO } from '@/lib/lanegames/types'
import type { NivelTest, PreguntaTest, SemanaTest } from '@/lib/lanegames/types'
import { claveJuego, usePersistente } from '@/lib/lanegames/store'

const LETRAS = ['A', 'B', 'C', 'D']

interface Partida {
  /** Índice elegido (0–3) por id de pregunta. */
  respuestas: Record<string, number>
  /** Pregunta en pantalla. */
  indice: number
}

const PARTIDA_VACIA: Partida = { respuestas: {}, indice: 0 }

export function QuizSemanal({ semana }: { semana: SemanaTest }) {
  const [nivel, setNivel] = useState<NivelTest>('facil')

  // Cada nivel tiene su propia partida guardada: cambiar de nivel no la pierde.
  const clave = claveJuego('test', semana.semana, nivel)
  const { valor: partida, setValor: setPartida, reiniciar } = usePersistente<Partida>(clave, PARTIDA_VACIA)

  const preguntas = semana.preguntas[nivel]
  const indice = Math.min(partida.indice, Math.max(preguntas.length - 1, 0))
  const pregunta = preguntas[indice]

  const aciertos = useMemo(
    () => preguntas.filter((p) => partida.respuestas[p.id] === p.correcta).length,
    [preguntas, partida.respuestas],
  )
  const respondidas = useMemo(
    () => preguntas.filter((p) => partida.respuestas[p.id] !== undefined).length,
    [preguntas, partida.respuestas],
  )
  const terminado = preguntas.length > 0 && respondidas === preguntas.length
  const elegida = pregunta ? partida.respuestas[pregunta.id] : undefined
  const respondida = elegida !== undefined

  function responder(opcion: number) {
    if (!pregunta || respondida) return
    setPartida((p) => ({ ...p, respuestas: { ...p.respuestas, [pregunta.id]: opcion } }))
  }

  function avanzar(paso: number) {
    setPartida((p) => ({ ...p, indice: Math.min(Math.max(p.indice + paso, 0), preguntas.length - 1) }))
  }

  if (!pregunta) {
    return (
      <p className="border border-ink/[0.14] bg-cream/40 p-8 text-center label-mono text-ink/40">
        Esta semana no tiene preguntas de nivel {NIVEL_INFO[nivel].label.toLowerCase()}
      </p>
    )
  }

  return (
    <div>
      {/* Nivel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Nivel del test" className="inline-flex shrink-0 border border-ink/[0.14] bg-cream/60 p-1">
          {NIVELES.map((n) => {
            const on = n === nivel
            const hechas = semana.preguntas[n].filter((p) => p.id in partida.respuestas).length
            return (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setNivel(n)}
                className={`px-3.5 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 ${
                  on ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'
                }`}
              >
                {NIVEL_INFO[n].label}
                {on && hechas > 0 && (
                  <span className="ml-1.5 tabular-nums opacity-60">{hechas}/{semana.preguntas[n].length}</span>
                )}
              </button>
            )
          })}
        </div>

        <p className="font-mono text-[0.58rem] leading-relaxed tracking-[0.12em] uppercase text-ink/35">
          {NIVEL_INFO[nivel].pista}
        </p>
      </div>

      {/* Progreso */}
      <div className="mt-5 flex items-center gap-3">
        <div className="h-[3px] flex-1 bg-ink/[0.10]">
          <div
            className="h-full bg-mint transition-[width] duration-300"
            style={{ width: `${(respondidas / preguntas.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[0.6rem] tracking-[0.16em] uppercase tabular-nums text-ink/45">
          {aciertos}/{preguntas.length} aciertos
        </span>
      </div>

      {terminado && (
        <Resultado
          preguntas={preguntas}
          respuestas={partida.respuestas}
          aciertos={aciertos}
          onReiniciar={reiniciar}
          onRevisar={(i) => setPartida((p) => ({ ...p, indice: i }))}
        />
      )}

      {/* Pregunta */}
      <article key={pregunta.id} className="panel-enter mt-6 border border-ink/[0.14] bg-cream/40 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="label-mono text-ink/45">Pregunta {indice + 1} de {preguntas.length}</span>
          {pregunta.tema && (
            <span className="border border-ink/20 px-2 py-0.5 label-mono text-ink/55">{pregunta.tema}</span>
          )}
        </div>

        <h4
          className="mt-3.5 font-brand font-extrabold leading-[1.12] tracking-brand text-ink"
          style={{ fontSize: 'clamp(19px, 2.3vw, 26px)' }}
        >
          {pregunta.pregunta}
        </h4>

        <div className="mt-5 grid gap-2">
          {pregunta.opciones.map((opcion, i) => (
            <Opcion
              key={i}
              letra={LETRAS[i]}
              texto={opcion}
              estado={
                !respondida ? 'abierta'
                  : i === pregunta.correcta ? 'acierto'
                  : i === elegida ? 'fallo'
                  : 'descartada'
              }
              onClick={() => responder(i)}
            />
          ))}
        </div>

        {respondida && (
          <div className="panel-enter mt-5 border-l-2 border-ink/25 bg-paper/70 py-3 pl-4 pr-3" aria-live="polite">
            <p className="label-mono text-ink/45">
              {elegida === pregunta.correcta ? 'Correcto' : `La correcta era la ${LETRAS[pregunta.correcta]}`}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{pregunta.explicacion}</p>
            {pregunta.fuente && (
              <p className="mt-2 font-mono text-[0.55rem] tracking-[0.16em] uppercase text-ink/30">
                fuente · {pregunta.fuente}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => avanzar(-1)}
            disabled={indice === 0}
            className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-ink/40 transition-colors hover:text-ink disabled:opacity-25 disabled:hover:text-ink/40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => avanzar(1)}
            disabled={!respondida || indice === preguntas.length - 1}
            className="bg-ink px-5 py-2.5 font-mono text-[0.62rem] tracking-[0.16em] uppercase text-cream transition-opacity hover:opacity-90 disabled:opacity-25"
          >
            Siguiente →
          </button>
        </div>
      </article>
    </div>
  )
}

function Opcion({
  letra, texto, estado, onClick,
}: {
  letra: string
  texto: string
  estado: 'abierta' | 'acierto' | 'fallo' | 'descartada'
  onClick: () => void
}) {
  const marco = {
    abierta:    'border-ink/[0.14] bg-paper hover:border-ink/35 hover:bg-cream',
    acierto:    'border-ink bg-mint/30',
    fallo:      'border-red-300 bg-red-50',
    descartada: 'border-ink/[0.10] bg-paper opacity-45',
  }[estado]

  const chip = {
    abierta:    'bg-ink/[0.06] text-ink/55',
    acierto:    'bg-ink text-mint',
    fallo:      'bg-red-200 text-red-800',
    descartada: 'bg-ink/[0.06] text-ink/40',
  }[estado]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={estado !== 'abierta'}
      className={`flex w-full items-center gap-3 border px-3.5 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 ${marco}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[0.68rem] font-semibold ${chip}`}>
        {letra}
      </span>
      <span className="text-sm leading-snug text-ink/85">{texto}</span>
    </button>
  )
}

function Resultado({
  preguntas, respuestas, aciertos, onReiniciar, onRevisar,
}: {
  preguntas: PreguntaTest[]
  respuestas: Record<string, number>
  aciertos: number
  onReiniciar: () => void
  onRevisar: (indice: number) => void
}) {
  const total = preguntas.length
  const nota =
    aciertos === total ? 'Pleno, sin un fallo.'
      : aciertos >= total * 0.75 ? 'Muy buena tanda.'
      : aciertos >= total * 0.5 ? 'Aprobado justo.'
      : 'Toca repasar las tablas.'

  return (
    <div className="panel-enter mt-6 flex flex-col gap-5 bg-ink p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <p className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-cream/45">Test completado</p>
        <p className="mt-1.5 font-brand text-4xl font-extrabold leading-none tracking-brand tabular-nums text-mint sm:text-5xl">
          {aciertos}<span className="text-cream/35">/{total}</span>
        </p>
        <p className="mt-2 text-sm text-cream/70">{nota}</p>
      </div>

      <div className="flex flex-col items-start gap-3 sm:items-end">
        {/* Repaso rápido: cada casilla lleva a su pregunta. */}
        <div className="flex flex-wrap gap-1.5">
          {preguntas.map((p, i) => {
            const ok = respuestas[p.id] === p.correcta
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onRevisar(i)}
                title={`Pregunta ${i + 1}: ${ok ? 'acierto' : 'fallo'}`}
                className={`h-7 w-7 font-mono text-[0.6rem] tabular-nums transition-opacity hover:opacity-75 ${
                  ok ? 'bg-mint text-ink' : 'bg-cream/15 text-cream/60'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onReiniciar}
          className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-cream/50 transition-colors hover:text-mint"
        >
          Volver a empezar
        </button>
      </div>
    </div>
  )
}
