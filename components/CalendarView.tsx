'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Competition } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const ITEM_W = 88

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

// ─── lanedata mark SVG ────────────────────────────────────────────────────────
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

// ─── Article modal ────────────────────────────────────────────────────────────
interface ModalComp {
  nombre: string
  fecha: string
  disciplina: string | null
  ciudad: string | null
  article: { slug: string; title: string }
}

function ArticleModal({ comp, onClose }: { comp: ModalComp; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-paper overflow-hidden shadow-[0_24px_60px_rgba(13,42,20,0.25)]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Análisis lanedata"
      >
        {/* Top strip */}
        <div className="bg-ink px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <LanedataMark size={22} />
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-7 w-7 items-center justify-center rounded-full text-cream/40 hover:text-cream hover:bg-cream/10 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Competition info */}
          <p className="font-mono text-[0.6rem] tracking-widest uppercase text-mint/70 mb-1">
            {comp.fecha}{comp.disciplina ? ` · ${comp.disciplina}` : ''}{comp.ciudad ? ` · ${comp.ciudad}` : ''}
          </p>
          <p className="text-sm font-semibold text-cream/80 leading-snug">{comp.nombre}</p>
        </div>

        {/* Article section */}
        <div className="px-5 py-5">
          <p className="font-mono text-[0.58rem] tracking-widest uppercase text-ink/35 mb-2">
            Cobertura lanedata
          </p>
          <p className="font-brand text-xl font-extrabold tracking-brand text-ink leading-snug mb-5">
            {comp.article.title}
          </p>

          <div className="flex items-center gap-3">
            <Link
              href={`/articulo/${comp.article.slug}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-brand font-bold text-sm text-cream hover:bg-ink/80 transition-colors active:scale-[0.98] duration-150"
            >
              Ver análisis
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M1 5h12M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <button
              onClick={onClose}
              className="rounded-xl border border-ink/[0.12] px-4 py-3 font-mono text-[0.68rem] tracking-wider uppercase text-ink/50 hover:text-ink hover:border-ink/25 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
        <div className="flex items-center"
          style={{ transform: `translateX(${offset}px)`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1)' }}>
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

// ─── Regular card (no article) ────────────────────────────────────────────────
function RegularCard({ comp }: { comp: Competition }) {
  const disc     = comp.disciplina ?? ''
  const discMeta = DISC[disc]
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink/[0.07] bg-paper px-4 py-3.5
      transition-[transform,box-shadow] duration-200
      hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(13,42,20,0.07)]">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums text-ink/60">
          {formatFecha(comp.fecha_inicio, comp.fecha_fin)}
        </span>
        {discMeta && disc && (
          <span className={`flex items-center gap-1 ${discMeta.label}`}>
            <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${discMeta.dot}`} />
            <span className="font-mono text-[0.57rem] tracking-widest uppercase">{disc}</span>
          </span>
        )}
        {comp.area && (
          <span className="ml-auto font-mono text-[0.57rem] tracking-widest uppercase text-ink/25">{comp.area}</span>
        )}
      </div>
      <p className="text-[0.83rem] font-semibold text-ink/85 leading-snug">{comp.nombre}</p>
      {comp.ciudad && (
        <p className="font-mono text-[0.57rem] tracking-wide text-ink/25 uppercase">{comp.ciudad}</p>
      )}
    </div>
  )
}

// ─── Featured card (has article) — dark, clickable ───────────────────────────
function FeaturedCard({
  comp, onClick,
}: { comp: Competition; onClick: () => void }) {
  const disc     = comp.disciplina ?? ''
  const discMeta = DISC[disc]

  return (
    <button
      onClick={onClick}
      className="group text-left flex flex-col gap-3 rounded-xl bg-ink px-4 pt-4 pb-3.5 cursor-pointer
        transition-[transform,box-shadow] duration-200
        hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(13,42,20,0.22)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums text-cream/45">
          {formatFecha(comp.fecha_inicio, comp.fecha_fin)}
        </span>
        {discMeta && disc && (
          <span className="flex items-center gap-1 text-cream/35">
            <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${discMeta.dot} opacity-70`} />
            <span className="font-mono text-[0.57rem] tracking-widest uppercase">{disc}</span>
          </span>
        )}
        {comp.area && (
          <span className="font-mono text-[0.57rem] tracking-widest uppercase text-cream/20">{comp.area}</span>
        )}
        <span className="ml-auto shrink-0"><LanedataMark size={17} /></span>
      </div>

      {/* Competition name */}
      <p className="text-[0.87rem] font-bold text-cream leading-snug tracking-[-0.01em]">{comp.nombre}</p>
      {comp.ciudad && (
        <p className="font-mono text-[0.57rem] tracking-wide text-cream/25 uppercase -mt-1.5">{comp.ciudad}</p>
      )}

      {/* Divider */}
      <div className="border-t border-cream/[0.09]" />

      {/* Article hint */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.58rem] tracking-widest uppercase text-mint/60">Análisis lanedata</span>
        <span className="ml-auto font-mono text-[0.62rem] text-cream/30 group-hover:text-mint transition-colors duration-200">
          Ver →
        </span>
      </div>
    </button>
  )
}

// ─── Month header ─────────────────────────────────────────────────────────────
function MonthHeader({ mes, total, conArticulo }: { mes: number; total: number; conArticulo: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="font-brand text-2xl font-extrabold tracking-brand text-ink">{ALL_MONTHS[mes]}</h2>
      <span className="font-mono text-[0.6rem] tracking-widest text-ink/28 uppercase">{total} competiciones</span>
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-[88px] rounded-xl bg-ink/[0.04] animate-pulse" />
      ))}
    </div>
  )
}

// ─── Main component (self-fetching, always fresh) ────────────────────────────
export function CalendarView() {
  const supabaseRef = useRef(createClient())
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<ModalComp | null>(null)

  useEffect(() => {
    const supabase = supabaseRef.current
    supabase
      .from('competitions')
      .select('id, fecha_inicio, fecha_fin, disciplina, nombre, area, ciudad, article_id, article:articles(slug, title)')
      .order('fecha_inicio', { ascending: true })
      .then(({ data }) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const raw = (data ?? []) as any[]
        setCompetitions(raw.map((c: any) => ({
          ...c,
          article: Array.isArray(c.article) ? (c.article[0] ?? null) : (c.article ?? null),
        })))
        /* eslint-enable @typescript-eslint/no-explicit-any */
        setLoading(false)
      })
  }, [])

  const mesesConDatos = Array.from(
    new Set(competitions.map(c => getMes(c.fecha_inicio)))
  ).sort((a, b) => a - b)

  const defaultMes = (() => {
    const now = new Date().getMonth()
    return mesesConDatos.includes(now) ? now : (mesesConDatos[0] ?? 0)
  })()

  const [mesActivo, setMesActivo] = useState(defaultMes)

  // Sync default month once data loads
  useEffect(() => {
    if (mesesConDatos.length > 0) {
      const now = new Date().getMonth()
      setMesActivo(mesesConDatos.includes(now) ? now : mesesConDatos[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const filtered = competitions
    .filter(c => getMes(c.fecha_inicio) === mesActivo)
    .sort((a, b) => {
      if (a.article && !b.article) return -1
      if (!a.article && b.article) return 1
      return a.fecha_inicio.localeCompare(b.fecha_inicio)
    })

  const conArticulo = filtered.filter(c => c.article).length

  function openModal(comp: Competition) {
    if (!comp.article) return
    setModal({
      nombre:     comp.nombre,
      fecha:      formatFecha(comp.fecha_inicio, comp.fecha_fin),
      disciplina: comp.disciplina,
      ciudad:     comp.ciudad,
      article:    comp.article,
    })
  }

  return (
    <>
      {modal && <ArticleModal comp={modal} onClose={() => setModal(null)} />}

      {loading ? (
        // Show skeleton drum-roll area too
        <div>
          <div className="h-12 mb-10 rounded-full bg-ink/[0.04] animate-pulse" />
          <Skeleton />
        </div>
      ) : (
        <>
          <MonthPicker months={mesesConDatos} active={mesActivo} onChange={setMesActivo} />
          <MonthHeader mes={mesActivo} total={filtered.length} conArticulo={conArticulo} />

          {filtered.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(c =>
                c.article
                  ? <FeaturedCard key={c.id} comp={c} onClick={() => openModal(c)} />
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
              .filter(([k]) => !k.includes('Libre'))
              .map(([name, meta]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${meta.dot}`} />
                  <span className="font-mono text-[0.58rem] tracking-wider text-ink/30 uppercase">{name}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  )
}
