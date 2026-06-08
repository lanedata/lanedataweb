'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Competition } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MONTHS  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const ITEM_W = 88 // px per month pill

const DISC_COLOR: Record<string, string> = {
  'Ruta':             'bg-blue-50   text-blue-700   border-blue-200',
  'Cross':            'bg-amber-50  text-amber-700  border-amber-200',
  'Pista Aire Libre': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Trail Running':    'bg-orange-50  text-orange-700  border-orange-200',
  'Short Track':      'bg-violet-50  text-violet-700  border-violet-200',
  'Marcha':           'bg-cyan-50    text-cyan-700    border-cyan-200',
  'Internacional':    'bg-rose-50    text-rose-700    border-rose-200',
}
const AREA_STYLE: Record<string, string> = {
  'WA':   'bg-mint/30 text-ink',
  'EA':   'bg-sky-100 text-sky-800',
  'RFEA': 'bg-ink/8   text-ink/60',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}

function formatFecha(inicio: string, fin: string | null) {
  const d1 = new Date(inicio + 'T12:00:00')
  if (!fin || fin === inicio)
    return `${d1.getDate()} ${SHORT_MONTHS[d1.getMonth()]}`
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth())
    return `${d1.getDate()}–${d2.getDate()} ${SHORT_MONTHS[d1.getMonth()]}`
  return `${d1.getDate()} ${SHORT_MONTHS[d1.getMonth()]} – ${d2.getDate()} ${SHORT_MONTHS[d2.getMonth()]}`
}

// ─── Drum‑roll month picker ───────────────────────────────────────────────────
function MonthPicker({
  months, active, onChange,
}: { months: number[]; active: number; onChange: (m: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerW(el.clientWidth)
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Touch drag
  const touchX = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchX.current
    const steps = Math.round(-dx / (ITEM_W * 0.6))
    if (steps !== 0) navigate(steps)
  }

  const navigate = useCallback((delta: number) => {
    const idx = months.indexOf(active)
    const next = Math.max(0, Math.min(months.length - 1, idx + delta))
    onChange(months[next])
  }, [active, months, onChange])

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const offset = containerW / 2 - active * ITEM_W - ITEM_W / 2
  const activeIdx = months.indexOf(active)

  return (
    <div className="relative mb-10 select-none">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-paper to-transparent" />

      {/* Prev arrow */}
      <button
        onClick={() => navigate(-1)}
        disabled={activeIdx <= 0}
        aria-label="Mes anterior"
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:text-ink disabled:opacity-20 transition-colors duration-150"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Strip */}
      <div
        ref={containerRef}
        className="overflow-hidden py-3"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex items-center"
          style={{
            transform: `translateX(${offset}px)`,
            transition: 'transform 280ms cubic-bezier(0.23,1,0.32,1)',
          }}
        >
          {ALL_MONTHS.map((name, i) => {
            const isActive  = i === active
            const hasData   = months.includes(i)
            const dist      = Math.abs(i - active)
            const opacity   = isActive ? 1 : dist === 1 ? 0.55 : dist === 2 ? 0.28 : 0.1
            const scale     = isActive ? 1 : dist === 1 ? 0.82 : 0.68

            return (
              <button
                key={i}
                onClick={() => hasData && onChange(i)}
                disabled={!hasData}
                style={{
                  width: ITEM_W,
                  opacity,
                  transform: `scale(${scale})`,
                  transition: 'transform 280ms cubic-bezier(0.23,1,0.32,1), opacity 280ms ease',
                }}
                className={`flex-none flex flex-col items-center gap-1 cursor-pointer disabled:cursor-default`}
                aria-current={isActive ? 'true' : undefined}
              >
                {/* Pill */}
                <span className={`rounded-full px-3 py-1 font-brand font-bold text-sm whitespace-nowrap transition-colors duration-200 ${
                  isActive
                    ? 'bg-mint text-ink'
                    : 'text-ink/70'
                }`}>
                  {isActive ? name : SHORT_MONTHS[i]}
                </span>
                {/* Dot indicator */}
                <span className={`w-1 h-1 rounded-full transition-colors duration-200 ${isActive ? 'bg-mint' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Next arrow */}
      <button
        onClick={() => navigate(1)}
        disabled={activeIdx >= months.length - 1}
        aria-label="Mes siguiente"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:text-ink disabled:opacity-20 transition-colors duration-150"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Competition card (mobile + desktop) ──────────────────────────────────────
function CompCard({ comp }: { comp: Competition }) {
  const discColor = comp.disciplina ? (DISC_COLOR[comp.disciplina] ?? 'bg-ink/5 text-ink/60 border-ink/10') : null
  const areaStyle = comp.area ? (AREA_STYLE[comp.area] ?? 'bg-ink/5 text-ink/60') : null

  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-ink/[0.08] bg-paper px-4 py-3.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(13,42,20,0.07)]">
      {/* Top row: date · discipline · area */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[0.68rem] tracking-wider text-ink/45 uppercase shrink-0">
          {formatFecha(comp.fecha_inicio, comp.fecha_fin)}
        </span>
        {discColor && comp.disciplina && (
          <span className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-mono tracking-wider uppercase ${discColor}`}>
            {comp.disciplina}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {areaStyle && comp.area && (
            <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-mono font-semibold tracking-wider uppercase ${areaStyle}`}>
              {comp.area}
            </span>
          )}
        </div>
      </div>

      {/* Competition name */}
      <p className="text-sm font-semibold text-ink leading-snug">
        {comp.nombre}
      </p>

      {/* Bottom row: city + analysis link */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        {comp.ciudad ? (
          <span className="font-mono text-[0.62rem] tracking-wide text-ink/35 uppercase">
            📍 {comp.ciudad}
          </span>
        ) : <span />}

        {comp.article ? (
          <Link
            href={`/articulo/${comp.article.slug}`}
            className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 font-brand text-[0.7rem] font-bold text-ink hover:bg-mint/80 transition-colors duration-150 active:scale-[0.97] shrink-0"
          >
            Análisis
            <svg width="9" height="7" viewBox="0 0 12 9" fill="none" aria-hidden="true">
              <path d="M1 4.5h10M7.5 1l3.5 3.5L7.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
interface Props {
  competitions: Competition[]
}

export function CalendarView({ competitions }: Props) {
  const mesesConDatos = Array.from(
    new Set(competitions.map(c => getMes(c.fecha_inicio)))
  ).sort((a, b) => a - b)

  const defaultMes = (() => {
    const now = new Date().getMonth()
    return mesesConDatos.includes(now) ? now : mesesConDatos[0] ?? 0
  })()

  const [mesActivo, setMesActivo] = useState(defaultMes)

  const filtered = competitions.filter(c => getMes(c.fecha_inicio) === mesActivo)
  const conArticulo = filtered.filter(c => c.article).length

  return (
    <div>
      <MonthPicker
        months={mesesConDatos}
        active={mesActivo}
        onChange={setMesActivo}
      />

      {/* Month stats */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-brand text-xl font-extrabold tracking-brand text-ink">
          {ALL_MONTHS[mesActivo]}
        </h2>
        <span className="font-mono text-[0.65rem] tracking-widest text-ink/35 uppercase">
          {filtered.length} competiciones
        </span>
        {conArticulo > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/20 px-2 py-0.5 font-mono text-[0.62rem] tracking-wider text-ink/60 uppercase">
            {conArticulo} con análisis
          </span>
        )}
        <div className="ml-auto h-px flex-1 bg-ink/[0.08]" />
      </div>

      {/* Grid of competition cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <CompCard key={c.id} comp={c} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-ink/[0.08] bg-cream/40 py-16 text-center">
          <p className="font-mono text-sm text-ink/30">Sin competiciones este mes</p>
        </div>
      )}
    </div>
  )
}
