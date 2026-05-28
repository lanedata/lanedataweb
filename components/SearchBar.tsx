'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
}

export function SearchBar({ defaultValue = '', autoFocus = false }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    startTransition(() => {
      router.push(`/buscar?q=${encodeURIComponent(q)}`)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar artículos"
      className="relative flex items-center"
    >
      <label htmlFor="search-input" className="sr-only">Buscar en lanedata</label>
      <input
        id="search-input"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Busca por título, atleta, campeonato…"
        autoFocus={autoFocus}
        className="w-full rounded-full border border-ink/[0.15] bg-cream/60 px-5 py-3 pr-12 text-sm text-ink placeholder:text-ink/40 focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 transition-colors"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-cream transition-transform hover:scale-105"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
    </form>
  )
}
