'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Competition } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const ITEM_W = 88

// Per-discipline: a tiny dot colour + label colour. No bars, no pills.
const DISC: Record<string, { dot: string; label: string }> = {
  'Pista Aire libre': { dot: 'bg-emerald-500', label: 'text-emerald-600/80' },
  'Pista Aire Libre': { dot: 'bg-emerald-500', label: 'text-emerald-600/80' },
  'Ruta':             { dot: 'bg-blue-500',    label: 'text-blue-600/80'    },
  'Cross':            { dot: 'bg-amber-500',   label: 'text-amber-600/80'   },
  'Trail Running':    { dot: 'bg-orange-500',  label: 'text-orange-600/80'  },
  'Short Track':      { dot: 'bg-violet-500',  label: 'text-violet-600/80'  },
  'Marcha':           { dot: 'bg-cyan-500',    label: 'text-cyan-600/80'    },
  'Internacional':    { dot: 'bg-rose-500',    label: 'text-rose-600/80'    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}

function formatFecha(inicio: string, fin: string | null) {
  const d1 = new Date(inicio + 'T12:00:00')
  const m1 = SHORT_MONTHS[d1.getMonth()]
  if (!fin || fin === inicio) return `${d1.getDate()} ${m1}`
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) return `${d1.getDate()}–${d2.getDate()} ${m1}`
  return `${d1.getDate()} ${m1}–${d2.getDate()} ${SHORT_MONTHS[d2.getMonth()]}`
}

// ─── Drum-roll month picker ───────────────────────────────────────────────────
function MonthPicker({
  months, active, onChange,
}: { months: number[]; active: number; onChange: (m: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(360)
  const touchX = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerW(el.clientWidth)
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const navigate = useCallback((delta: number) => {
    const idx  = months.indexOf(active)
    const next = Math.max(0, Math.min(months.length - 1, idx + delta))
    onChange(months[next])
  }, [active, months, onChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const offset    = containerW / 2 - active * ITEM_W - ITEM_W / 2
  const activeIdx = months.indexOf(active)

  return (
    <div className="relative mb-10 select-none">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-paper to-transparent" />

      <button onClick={() => navigate(-1)} disabled={activeIdx <= 0} aria-label="Mes anterior"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center text-ink/30 hover:text-ink disabled:opacity-20 transition-colors">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div ref={containerRef} className="overflow-hidden py-2"
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const steps = Math.round(-(e.changedTouches[0].clientX - touchX.current) / (ITEM_W * 0.6))
          if (steps !== 0) navigate(steps)
        }}>
        <div className="flex items-center" style={{ transform: `translateX(${offset}px)`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1)' }}>
          {ALL_MONTHS.map((name, i) => {
            const isActive = i === active
            const hasData  = months.includes(i)
            const dist     = Math.abs(i - active)
            const opacity  = isActive ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.22 : 0.07
            const scale    = isActive ? 1 : dist === 1 ? 0.8 : 0.65
            return (
              <button key={i} onClick={() => hasData && onChange(i)} disabled={!hasData}
                aria-current={isActive ? 'true' : undefined}
                style={{ width: ITEM_W, opacity, transform: `scale(${scale})`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 300ms ease' }}
                className="flex-none flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-default">
                <span className={`rounded-full px-3.5 py-1 font-brand font-bold text-sm whitespace-nowrap transition-colors duration-200 ${isActive ? 'bg-mint text-ink' : 'text-ink/55'}`}>
                  {isActive ? name : SHORT_MONTHS[i]}
                </span>
                <span className={`w-1 h-1 rounded-full transition-all duration-200 ${isActive ? 'bg-mint' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={() => navigate(1)} disabled={activeIdx >= months.length - 1} aria-label="Mes siguiente"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center text-ink/30 hover:text-ink disabled:opacity-20 transition-colors">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

// ─── lanedata mark (inline, used as editorial stamp) ─────────────────────────
function LanedataMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <rect width="200" height="200" rx="44" fill="#9FE88D"/>
      <ellipse cx="74"  cy="108" rx="18" ry="26" fill="#0D2A14"/>
      <ellipse cx="126" cy="108" rx="18" ry="26" fill="#0D2A14"/>
      <circle  cx="67"  cy="96"  r="5.5"          fill="#9FE88D"/>
      <circle  cx="119" cy="96"  r="5.5"          fill="#9FE88D"/>
    </svg>
  )
}

// ─── Card: competition WITHOUT linked article ─────────────────────────────────
function RegularCard({ comp }: { comp: Competition }) {
  const disc     = comp.disciplina ?? ''
  const discMeta = DISC[disc]
  const fecha    = formatFecha(comp.fecha_inicio, comp.fecha_fin)

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-ink/[0.07] bg-paper px-4 py-3.5
      transition-[transform,box-shadow] duration-200
      hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(13,42,20,0.07)]">

      {/* Top row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums text-ink/60">{fecha}</span>

        {discMeta && disc && (
          <span className={`flex items-center gap-1 ${discMeta.label}`}>
            <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${discMeta.dot}`} />
            <span className="font-mono text-[0.57rem] tracking-widest uppercase">{disc}</span>
          </span>
        )}

        {comp.area && (
          <span className="ml-auto font-mono text-[0.57rem] tracking-widest uppercase text-ink/25">
            {comp.area}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[0.83rem] font-semibold text-ink/85 leading-snug">
        {comp.nombre}
      </p>

      {/* City */}
      {comp.ciudad && (
        <p className="font-mono text-[0.57rem] tracking-wide text-ink/25 uppercase">{comp.ciudad}</p>
      )}
    </div>
  )
}

// ─── Card: competition WITH linked article (editorial / dark) ────────────────
function FeaturedCard({ comp }: { comp: Competition }) {
  const disc     = comp.disciplina ?? ''
  const discMeta = DISC[disc]
  const fecha    = formatFecha(comp.fecha_inicio, comp.fecha_fin)

  if (!comp.article) return null

  return (
    <div className="group flex flex-col gap-3 rounded-xl bg-ink px-4 pt-4 pb-3.5
      transition-[transform,box-shadow] duration-200
      hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(13,42,20,0.22)]">

      {/* Top row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums text-cream/45">{fecha}</span>

        {discMeta && disc && (
          <span className="flex items-center gap-1 text-cream/35">
            <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${discMeta.dot} opacity-70`} />
            <span className="font-mono text-[0.57rem] tracking-widest uppercase">{disc}</span>
          </span>
        )}

        {comp.area && (
          <span className="font-mono text-[0.57rem] tracking-widest uppercase text-cream/20">
            {comp.area}
          </span>
        )}

        {/* Lanedata stamp — pushed to the right */}
        <span className="ml-auto shrink-0">
          <LanedataMark size={17} />
        </span>
      </div>

      {/* Competition name */}
      <p className="text-[0.87rem] font-bold text-cream leading-snug tracking-[-0.01em]">
        {comp.nombre}
      </p>

      {/* City */}
      {comp.ciudad && (
        <p className="font-mono text-[0.57rem] tracking-wide text-cream/25 uppercase -mt-1.5">
          {comp.ciudad}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-cream/[0.09]" />

      {/* Article link */}
      <Link
        href={`/articulo/${comp.article.slug}`}
        className="group/link flex items-start gap-2.5"
      >
        <span className="shrink-0 font-mono text-[0.65rem] text-mint mt-0.5 transition-transform duration-150 group-hover/link:translate-x-0.5">
          →
        </span>
        <div className="min-w-0">
          <div className="font-mono text-[0.57rem] tracking-widest uppercase text-mint/60 mb-0.5">
            Análisis lanedata
          </div>
          <div className="text-[0.78rem] font-medium text-cream/65 group-hover/link:text-cream/90 leading-snug transition-colors duration-150 line-clamp-2">
            {comp.article.title}
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── Month header bar ─────────────────────────────────────────────────────────
function MonthHeader({ mes, total, conArticulo }: { mes: number; total: number; conArticulo: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="font-brand text-2xl font-extrabold tracking-brand text-ink">
        {ALL_MONTHS[mes]}
      </h2>
      <span className="font-mono text-[0.6rem] tracking-widest text-ink/28 uppercase">
        {total} competiciones
      </span>
      {conArticulo > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/40 px-2.5 py-0.5
          font-mono text-[0.58rem] tracking-wider text-ink/55 uppercase bg-mint/10">
          <LanedataMark size={10} />
          {conArticulo} con cobertura
        </span>
      )}
      <div className="ml-auto h-px flex-1 bg-ink/[0.07] self-center" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CalendarView({ competitions }: { competitions: Competition[] }) {
  const mesesConDatos = Array.from(
    new Set(competitions.map(c => getMes(c.fecha_inicio)))
  ).sort((a, b) => a - b)

  const defaultMes = (() => {
    const now = new Date().getMonth()
    return mesesConDatos.includes(now) ? now : (mesesConDatos[0] ?? 0)
  })()

  const [mesActivo, setMesActivo] = useState(defaultMes)

  // Sort: linked articles float to top, then chronological
  const filtered = competitions
    .filter(c => getMes(c.fecha_inicio) === mesActivo)
    .sort((a, b) => {
      if (a.article && !b.article) return -1
      if (!a.article && b.article) return 1
      return a.fecha_inicio.localeCompare(b.fecha_inicio)
    })

  const conArticulo = filtered.filter(c => c.article).length

  return (
    <div>
      <MonthPicker months={mesesConDatos} active={mesActivo} onChange={setMesActivo} />
      <MonthHeader mes={mesActivo} total={filtered.length} conArticulo={conArticulo} />

      {filtered.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c =>
            c.article
              ? <FeaturedCard key={c.id} comp={c} />
              : <RegularCard  key={c.id} comp={c} />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-ink/[0.08] bg-cream/40 py-16">
          <p className="font-mono text-sm text-ink/30">Sin competiciones este mes</p>
        </div>
      )}

      {/* Discipline legend */}
      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
        {Object.entries(DISC)
          .filter(([k]) => !k.includes('Libre')) // dedupe case variant
          .map(([name, meta]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${meta.dot}`} />
              <span className="font-mono text-[0.58rem] tracking-wider text-ink/30 uppercase">{name}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
