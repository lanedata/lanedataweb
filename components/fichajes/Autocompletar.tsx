'use client'

// Campo de texto con sugerencias (atletas o clubes). El texto escrito siempre
// vale por sí mismo: elegir una sugerencia solo ayuda a rellenar más rápido y
// a escribir el nombre exacto de la RFEA. Teclado: ↑ ↓ para moverse, Intro
// para elegir, Esc para cerrar.

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props<T> {
  value: string
  onChange: (texto: string) => void
  onPick: (item: T) => void
  buscar: (q: string) => Promise<T[]>
  clave: (item: T) => string
  pintar: (item: T) => ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function Autocompletar<T>({
  value, onChange, onPick, buscar, clave, pintar,
  placeholder, disabled, className = '', autoFocus,
}: Props<T>) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<T[]>([])
  const [activo, setActivo] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  // Evita que una búsqueda lenta pise a una posterior.
  const turno = useRef(0)
  // Tras elegir una sugerencia no se vuelve a abrir la lista con ese mismo texto.
  const recienElegido = useRef(false)
  const listaId = useId()

  useEffect(() => {
    if (recienElegido.current) { recienElegido.current = false; return }
    if (disabled || value.trim().length < 2) { setItems([]); return }
    const mio = ++turno.current
    const t = setTimeout(async () => {
      setCargando(true)
      try {
        const r = await buscar(value)
        if (mio !== turno.current) return
        setItems(r)
        setActivo(0)
        setAbierto(true)
        setErrorCarga(false)
      } catch {
        if (mio === turno.current) setErrorCarga(true)
      } finally {
        if (mio === turno.current) setCargando(false)
      }
    }, 120)
    return () => clearTimeout(t)
  }, [value, buscar, disabled])

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  function elegir(item: T) {
    recienElegido.current = true
    onPick(item)
    setAbierto(false)
    setItems([])
  }

  function teclas(e: React.KeyboardEvent) {
    if (!abierto || items.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => (a + 1) % items.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => (a - 1 + items.length) % items.length) }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(items[activo]) }
    else if (e.key === 'Escape') setAbierto(false)
  }

  return (
    <div ref={caja} className="relative">
      <input
        type="text"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setAbierto(true) }}
        onFocus={() => items.length > 0 && setAbierto(true)}
        onKeyDown={teclas}
        placeholder={placeholder}
        className={className}
      />
      {cargando && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 label-mono text-[0.55rem] text-ink/35">
          buscando…
        </span>
      )}
      {errorCarga && (
        <p className="mt-1 text-[0.72rem] text-ink/45">
          No se han podido cargar las sugerencias; escribe el nombre a mano.
        </p>
      )}
      {abierto && items.length > 0 && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto border border-ink/[0.18] bg-paper shadow-[0_12px_32px_rgba(13,42,20,0.14)]"
        >
          {items.map((it, i) => (
            <li
              key={clave(it)}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => { e.preventDefault(); elegir(it) }}
              onMouseEnter={() => setActivo(i)}
              className={`cursor-pointer border-b border-ink/[0.06] px-3.5 py-2.5 last:border-0 ${
                i === activo ? 'bg-mint/25' : 'bg-paper'
              }`}
            >
              {pintar(it)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
