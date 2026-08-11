'use client'

import type { ReactNode } from 'react'

export const MONO = 'font-mono text-[0.62rem] tracking-[0.18em] uppercase'

export const inputCls =
  'h-[46px] w-full border border-ink/[0.15] bg-cream/60 px-4 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-ink/30 tabular-nums'

export function LabField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`${MONO} text-ink/40`}>{label}</span>
      {children}
    </label>
  )
}

export function Segmented({
  options, value, onChange,
}: {
  options: { v: string; l: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex border border-ink/[0.14] bg-cream/60 p-1 w-full">
      {options.map(o => {
        const active = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex-1 px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors duration-150 ${
              active ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

/** A read-only metric shown in the dark result bar. */
export function Metric({ value, label, primary = false }: { value: string; label: string; primary?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`font-brand font-extrabold tracking-brand text-mint leading-none tabular-nums ${primary ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}>
        {value}
      </span>
      <span className="mt-1.5 font-mono text-[0.58rem] tracking-[0.2em] uppercase text-cream/45">{label}</span>
    </div>
  )
}
