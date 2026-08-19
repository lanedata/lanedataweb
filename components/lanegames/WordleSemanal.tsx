'use client'

// Wordle semanal de atletismo: una palabra por semana, seis intentos.
//
// La palabra sale de /wordle-semanal.csv, siempre en mayúsculas y sin tildes ni
// Ñ, así que el teclado es el latino de 26 letras y lo que se teclea se
// normaliza antes de compararlo. Las tres pistas del CSV van de vaga a casi
// evidente: la primera se ve de entrada (sin ella una palabra de nueve letras
// es una lotería) y las otras dos se desbloquean al fallar.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { corregir, estadoTeclado, normalizar } from '@/lib/lanegames/csv'
import type { Marca, PalabraWordle } from '@/lib/lanegames/types'
import { claveJuego, usePersistente } from '@/lib/lanegames/store'

const FILAS_TECLADO = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

/** Intentos fallados que hacen falta para que se abra cada pista. */
const PISTA_TRAS = [0, 2, 4]

interface Partida {
  /** Intentos ya enviados, en orden. */
  intentos: string[]
  /** Pistas destapadas a mano, además de las que abre el propio juego. */
  pistasAbiertas: number
}

const PARTIDA_VACIA: Partida = { intentos: [], pistasAbiertas: 1 }

export function WordleSemanal({ palabra }: { palabra: PalabraWordle }) {
  const clave = claveJuego('wordle', palabra.semana)
  const { valor: partida, setValor: setPartida, reiniciar } = usePersistente<Partida>(clave, PARTIDA_VACIA)
  const [actual, setActual] = useState('')
  const [aviso, setAviso] = useState('')

  const { intentos } = partida
  const ganado = intentos.includes(palabra.solucion)
  const agotado = intentos.length >= palabra.intentos
  const jugando = !ganado && !agotado

  const teclas = useMemo(() => estadoTeclado(intentos, palabra.solucion), [intentos, palabra.solucion])

  // Cuántas pistas se pueden leer ya: las que abre fallar y las pedidas a mano.
  const pistasPorFallos = PISTA_TRAS.filter((n) => intentos.length >= n).length
  const pistasVisibles = Math.min(
    Math.max(pistasPorFallos, partida.pistasAbiertas, jugando ? 0 : palabra.pistas.length),
    palabra.pistas.length,
  )

  // Al cambiar de semana se limpia lo tecleado, que no pertenece a la nueva.
  useEffect(() => { setActual(''); setAviso('') }, [clave])

  const enviar = useCallback(() => {
    if (!jugando) return
    if (actual.length !== palabra.longitud) {
      setAviso(`La palabra tiene ${palabra.longitud} letras`)
      return
    }
    if (intentos.includes(actual)) {
      setAviso('Ya has probado esa palabra')
      return
    }
    setPartida((p) => ({ ...p, intentos: [...p.intentos, actual] }))
    setActual('')
    setAviso('')
  }, [actual, intentos, jugando, palabra.longitud, setPartida])

  const escribir = useCallback((letra: string) => {
    if (!jugando) return
    setAviso('')
    setActual((v) => (v.length >= palabra.longitud ? v : v + letra))
  }, [jugando, palabra.longitud])

  const borrar = useCallback(() => {
    setAviso('')
    setActual((v) => v.slice(0, -1))
  }, [])

  // Teclado físico. Se ignora si hay modificadores o si se está escribiendo en
  // otro sitio de la página (el buscador de la nav, por ejemplo).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const activo = document.activeElement?.tagName
      if (activo === 'INPUT' || activo === 'TEXTAREA') return

      if (e.key === 'Enter') { enviar(); return }
      if (e.key === 'Backspace') { e.preventDefault(); borrar(); return }
      const letra = normalizar(e.key)
      if (letra.length === 1) escribir(letra)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enviar, borrar, escribir])

  const filas = Array.from({ length: palabra.intentos }, (_, i) => {
    if (i < intentos.length) return { texto: intentos[i], marcas: corregir(intentos[i], palabra.solucion) }
    if (i === intentos.length && jugando) return { texto: actual, marcas: null }
    return { texto: '', marcas: null }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
        {/* Tablero */}
        <div className="border border-ink/[0.14] bg-cream/40 px-3 py-5 sm:px-5 sm:py-6">
          <div
            className="mx-auto grid gap-1.5"
            style={{ maxWidth: `${palabra.longitud * 3.4}rem` }}
          >
            {filas.map((fila, i) => (
              <div
                key={i}
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${palabra.longitud}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: palabra.longitud }, (_, j) => (
                  <Casilla
                    key={j}
                    letra={fila.texto[j] ?? ''}
                    marca={fila.marcas ? fila.marcas[j] : null}
                    activa={fila.marcas === null && j === fila.texto.length && jugando && i === intentos.length}
                  />
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 text-center font-mono text-[0.58rem] tracking-[0.16em] uppercase text-ink/35" aria-live="polite">
            {aviso || (jugando
              ? `Intento ${intentos.length + 1} de ${palabra.intentos}`
              : ganado ? 'Resuelto' : 'Sin intentos')}
          </p>
        </div>

        {/* Desenlace */}
        {!jugando && (
          <div className={`panel-enter mt-4 p-5 sm:p-6 ${ganado ? 'bg-ink' : 'border border-ink/[0.14] bg-cream/60'}`}>
            <p className={`font-mono text-[0.58rem] tracking-[0.2em] uppercase ${ganado ? 'text-cream/45' : 'text-ink/40'}`}>
              {ganado ? `Acertada en ${intentos.length} ${intentos.length === 1 ? 'intento' : 'intentos'}` : 'La palabra era'}
            </p>
            <p className={`mt-1.5 font-brand text-3xl font-extrabold leading-none tracking-brand sm:text-4xl ${ganado ? 'text-mint' : 'text-ink'}`}>
              {palabra.solucion}
            </p>
            <p className={`mt-3 text-sm leading-relaxed ${ganado ? 'text-cream/70' : 'text-ink/70'}`}>
              {palabra.explicacion}
            </p>
            <button
              type="button"
              onClick={() => { reiniciar(); setActual('') }}
              className={`mt-4 font-mono text-[0.6rem] tracking-[0.16em] uppercase transition-colors ${
                ganado ? 'text-cream/50 hover:text-mint' : 'text-ink/40 hover:text-ink'
              }`}
            >
              Volver a jugar
            </button>
          </div>
        )}

        {/* Teclado */}
        <div className="mt-4 grid gap-1.5" aria-hidden={!jugando}>
          {FILAS_TECLADO.map((fila, i) => (
            <div key={fila} className="flex justify-center gap-1 sm:gap-1.5">
              {i === 2 && (
                <TeclaAncha etiqueta="Enviar" onClick={enviar} disabled={!jugando} />
              )}
              {fila.split('').map((letra) => (
                <Tecla key={letra} letra={letra} marca={teclas[letra]} onClick={() => escribir(letra)} disabled={!jugando} />
              ))}
              {i === 2 && (
                <TeclaAncha etiqueta="Borrar" onClick={borrar} disabled={!jugando} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pistas y ficha */}
      <aside className="border border-ink/[0.14] bg-paper p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="label-mono text-ink/45">Pistas</span>
          <span className="border border-ink/20 px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.14em] uppercase text-ink/50">
            {palabra.categoria}
          </span>
        </div>

        <ol className="mt-4 grid gap-3">
          {palabra.pistas.map((pista, i) => (
            <li key={i} className="flex gap-2.5">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[0.58rem] ${
                i < pistasVisibles ? 'bg-mint/40 text-ink' : 'bg-ink/[0.06] text-ink/30'
              }`}>
                {i + 1}
              </span>
              {i < pistasVisibles ? (
                <p className="text-sm leading-snug text-ink/75">{pista}</p>
              ) : (
                <p className="text-sm leading-snug text-ink/30">
                  Se abre al {i === 1 ? 'segundo' : 'cuarto'} intento
                </p>
              )}
            </li>
          ))}
        </ol>

        {jugando && pistasVisibles < palabra.pistas.length && (
          <button
            type="button"
            onClick={() => setPartida((p) => ({ ...p, pistasAbiertas: pistasVisibles + 1 }))}
            className="mt-4 w-full border border-ink/[0.14] bg-cream/60 py-2 font-mono text-[0.58rem] tracking-[0.16em] uppercase text-ink/50 transition-colors hover:border-ink/30 hover:text-ink"
          >
            Destapar la siguiente
          </button>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-ink/[0.10] pt-4">
          <Ficha valor={String(palabra.longitud)} label="letras" />
          <Ficha valor={String(palabra.letrasDistintas)} label="distintas" />
          <Ficha valor={palabra.dificultad === 'media' ? 'media' : palabra.dificultad === 'facil' ? 'fácil' : 'difícil'} label="nivel" />
        </dl>

        <p className="mt-4 font-mono text-[0.52rem] leading-relaxed tracking-[0.12em] uppercase text-ink/25">
          No hay diccionario: vale cualquier combinación de {palabra.longitud} letras
        </p>
      </aside>
    </div>
  )
}

function Casilla({ letra, marca, activa }: { letra: string; marca: Marca | null; activa: boolean }) {
  const estilo = marca === 'correcta' ? 'border-mint bg-mint text-ink'
    : marca === 'presente' ? 'border-amber-300 bg-amber-200 text-ink'
    : marca === 'ausente' ? 'border-transparent bg-ink/[0.13] text-ink/40'
    : letra ? 'border-ink/40 bg-paper text-ink'
    : activa ? 'border-ink/30 bg-paper text-ink'
    : 'border-ink/[0.14] bg-paper text-ink'

  return (
    <div
      className={`flex aspect-square items-center justify-center border-2 font-brand font-extrabold uppercase leading-none transition-colors duration-200 ${estilo}`}
      style={{ fontSize: 'clamp(14px, 3.4vw, 26px)' }}
    >
      {letra}
    </div>
  )
}

function Tecla({ letra, marca, onClick, disabled }: {
  letra: string
  marca?: Marca
  onClick: () => void
  disabled: boolean
}) {
  const estilo = marca === 'correcta' ? 'bg-mint text-ink'
    : marca === 'presente' ? 'bg-amber-200 text-ink'
    : marca === 'ausente' ? 'bg-ink/[0.13] text-ink/30'
    : 'bg-cream text-ink/80 hover:bg-cream/70'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Letra ${letra}`}
      className={`h-11 min-w-0 flex-1 border border-ink/[0.10] font-mono text-[0.72rem] font-semibold uppercase transition-colors duration-150 disabled:opacity-40 sm:h-12 sm:text-sm ${estilo}`}
    >
      {letra}
    </button>
  )
}

function TeclaAncha({ etiqueta, onClick, disabled }: { etiqueta: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 shrink-0 border border-ink/[0.10] bg-ink px-2.5 font-mono text-[0.52rem] tracking-[0.12em] uppercase text-cream transition-opacity hover:opacity-90 disabled:opacity-30 sm:h-12 sm:px-3.5 sm:text-[0.58rem]"
    >
      {etiqueta}
    </button>
  )
}

function Ficha({ valor, label }: { valor: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-brand text-xl font-extrabold leading-none tracking-brand tabular-nums text-ink">{valor}</dd>
      <span className="mt-1 block font-mono text-[0.52rem] tracking-[0.16em] uppercase text-ink/35">{label}</span>
    </div>
  )
}
