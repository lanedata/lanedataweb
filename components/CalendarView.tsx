'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Competition } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const ITEM_W = 88 // px per month pill

// discipline → { accent color, pill style, left-border color }
const DISC: Record<string, { pill: string; bar: string; icon: string }> = {
  'Pista Aire libre': { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',  bar: 'bg-emerald-400', icon: '🏟' },
  'Pista Aire Libre': { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',  bar: 'bg-emerald-400', icon: '🏟' },
  'Ruta':             { pill: 'bg-blue-50   text-blue-700   border-blue-200',       bar: 'bg-blue-400',    icon: '🛣' },
  'Cross':            { pill: 'bg-amber-50  text-amber-700  border-amber-200',      bar: 'bg-amber-400',   icon: '🌿' },
  'Trail Running':    { pill: 'bg-orange-50 text-orange-700 border-orange-200',     bar: 'bg-orange-400',  icon: '⛰' },
  'Short Track':      { pill: 'bg-violet-50 text-violet-700 border-violet-200',     bar: 'bg-violet-400',  icon: '⚡' },
  'Marcha':           { pill: 'bg-cyan-50   text-cyan-700   border-cyan-200',       bar: 'bg-cyan-400',    icon: '🚶' },
  'Internacional':    { pill: 'bg-rose-50   text-rose-700   border-rose-200',       bar: 'bg-rose-400',    icon: '🌍' },
}

const AREA_BADGE: Record<string, string> = {
  'WA':   'bg-[#9FE88D]/30 text-[#0D2A14] font-semibold',
  'EA':   'bg-sky-100 text-sky-800 font-semibold',
  'RFEA': 'bg-ink/[0.07] text-ink/50',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}

function formatFecha(inicio: string, fin: string | null) {
  const d1 = new Date(inicio + 'T12:00:00')
  const sMonth = SHORT_MONTHS[d1.getMonth()]
  if (!fin || fin === inicio) return { day: `${d1.getDate()}`, month: sMonth }
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth())
    return { day: `${d1.getDate()}–${d2.getDate()}`, month: sMonth }
  return { day: `${d1.getDate()} ${sMonth}–${d2.getDate()}`, month: SHORT_MONTHS[d2.getMonth()] }
}

// ─── Drum-roll month picker ───────────────────────────────────────────────────
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const offset   = containerW / 2 - active * ITEM_W - ITEM_W / 2
  const activeIdx = months.indexOf(active)

  return (
    <div className="relative mb-10 select-none">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-paper to-transparent" />

      {/* Prev */}
      <button
        onClick={() => navigate(-1)}
        disabled={activeIdx <= 0}
        aria-label="Mes anterior"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-ink/35 hover:text-ink disabled:opacity-20 transition-colors duration-150"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* Strip */}
      <div ref={containerRef} className="overflow-hidden py-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex items-center"
          style={{ transform: `translateX(${offset}px)`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1)' }}
        >
          {ALL_MONTHS.map((name, i) => {
            const isActive = i === active
            const hasData  = months.includes(i)
            const dist     = Math.abs(i - active)
            const opacity  = isActive ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.25 : 0.08
            const scale    = isActive ? 1 : dist === 1 ? 0.8 : 0.65

            return (
              <button
                key={i}
                onClick={() => hasData && onChange(i)}
                disabled={!hasData}
                style={{ width: ITEM_W, opacity, transform: `scale(${scale})`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 300ms ease' }}
                className="flex-none flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-default"
                aria-current={isActive ? 'true' : undefined}
              >
                <span className={`rounded-full px-3.5 py-1 font-brand font-bold text-sm whitespace-nowrap transition-colors duration-200 ${isActive ? 'bg-mint text-ink' : 'text-ink/60'}`}>
                  {isActive ? name : SHORT_MONTHS[i]}
                </span>
                <span className={`w-1 h-1 rounded-full transition-colors duration-200 ${isActive ? 'bg-mint' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={() => navigate(1)}
        disabled={activeIdx >= months.length - 1}
        aria-label="Mes siguiente"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-ink/35 hover:text-ink disabled:opacity-20 transition-colors duration-150"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

// ─── Single competition card ──────────────────────────────────────────────────
function CompCard({ comp }: { comp: Competition }) {
  const disc      = comp.disciplina ?? ''
  const discMeta  = DISC[disc]
  const areaStyle = comp.area ? (AREA_BADGE[comp.area] ?? 'bg-ink/[0.07] text-ink/50') : null
  const { day, month } = formatFecha(comp.fecha_inicio, comp.fecha_fin)
  const hasArticle = !!comp.article

  return (
    <div className={`group relative flex overflow-hidden rounded-xl border transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 ${
      hasArticle
        ? 'border-mint/40 bg-gradient-to-br from-mint/[0.06] to-paper shadow-[0_2px_12px_rgba(159,232,141,0.15)] hover:shadow-[0_6px_20px_rgba(159,232,141,0.22)]'
        : 'border-ink/[0.08] bg-paper hover:shadow-[0_4px_16px_rgba(13,42,20,0.07)]'
    }`}>

      {/* Left colour bar (discipline accent) */}
      {discMeta && (
        <div className={`w-1 shrink-0 ${discMeta.bar} ${hasArticle ? 'opacity-70' : 'opacity-50'}`} />
      )}

      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
        {/* Top meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date chip */}
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="font-mono text-[0.75rem] font-semibold text-ink/70 tabular-nums">{day}</span>
            <span className="font-mono text-[0.62rem] text-ink/35 ml-0.5">{month}</span>
          </div>

          {/* Discipline pill */}
          {discMeta && disc && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.55rem] tracking-wider uppercase ${discMeta.pill}`}>
              <span aria-hidden="true" className="text-[0.6rem]">{discMeta.icon}</span>
              {disc}
            </span>
          )}

          {/* Area badge — push to right */}
          {areaStyle && comp.area && (
            <span className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[0.58rem] tracking-widest uppercase ${areaStyle}`}>
              {comp.area}
            </span>
          )}
        </div>

        {/* Name */}
        <p className={`text-[0.82rem] font-semibold leading-snug ${hasArticle ? 'text-ink' : 'text-ink/90'}`}>
          {comp.nombre}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {comp.ciudad ? (
            <span className="font-mono text-[0.6rem] tracking-wide text-ink/30 uppercase truncate">
              {comp.ciudad}
            </span>
          ) : <span />}

          {hasArticle && comp.article ? (
            <Link
              href={`/articulo/${comp.article.slug}`}
              className="group/link inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 font-brand text-[0.68rem] font-bold text-ink hover:bg-mint/80 transition-all duration-150 active:scale-[0.96] shrink-0"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" className="opacity-70">
                <circle cx="5" cy="5" r="5"/>
              </svg>
              Análisis lanedata
              <svg width="8" height="6" viewBox="0 0 10 8" fill="none" aria-hidden="true" className="transition-transform duration-150 group-hover/link:translate-x-0.5">
                <path d="M1 4h8M5.5 1l3.5 3L5.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Month header ─────────────────────────────────────────────────────────────
function MonthHeader({ mes, total, conArticulo }: { mes: number; total: number; conArticulo: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="font-brand text-2xl font-extrabold tracking-brand text-ink">
        {ALL_MONTHS[mes]}
      </h2>
      <span className="font-mono text-[0.62rem] tracking-widest text-ink/30 uppercase pt-0.5">
        {total} competiciones
      </span>
      {conArticulo > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-mint/20 border border-mint/30 px-2.5 py-0.5 font-mono text-[0.6rem] tracking-wider text-ink/60 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-mint inline-block" />
          {conArticulo} {conArticulo === 1 ? 'análisis' : 'análisis'}
        </span>
      )}
      <div className="ml-auto h-px flex-1 bg-ink/[0.07]" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  competitions: Competition[]
}

export function CalendarView({ competitions }: Props) {
  const mesesConDatos = Array.from(
    new Set(competitions.map(c => getMes(c.fecha_inicio)))
  ).sort((a, b) => a - b)

  const defaultMes = (() => {
    const now = new Date().getMonth()
    return mesesConDatos.includes(now) ? now : (mesesConDatos[0] ?? 0)
  })()

  const [mesActivo, setMesActivo] = useState(defaultMes)

  const filtered     = competitions.filter(c => getMes(c.fecha_inicio) === mesActivo)
  const conArticulo  = filtered.filter(c => c.article).length

  // Sort: linked articles first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.article && !b.article) return -1
    if (!a.article && b.article) return 1
    return a.fecha_inicio.localeCompare(b.fecha_inicio)
  })

  return (
    <div>
      <MonthPicker months={mesesConDatos} active={mesActivo} onChange={setMesActivo} />

      <MonthHeader mes={mesActivo} total={filtered.length} conArticulo={conArticulo} />

      {sorted.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(c => (
            <CompCard key={c.id} comp={c} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-ink/[0.08] bg-cream/40 py-16">
          <p className="font-mono text-sm text-ink/30">Sin competiciones este mes</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(DISC).filter(([k]) => !k.includes('Libre')).map(([name, meta]) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${meta.bar}`} />
            <span className="font-mono text-[0.6rem] tracking-wider text-ink/35 uppercase">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
