'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { pruebasUnicas, type RfeaCompeticion } from '@/lib/competiciones'

const ALL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ITEM_W = 88

const DISC_DOT: Record<string, string> = {
  'Pista Aire libre': 'bg-emerald-500',
  'Ruta': 'bg-blue-500',
  'Cross': 'bg-amber-500',
  'Trail': 'bg-orange-500',
  'Marcha': 'bg-cyan-500',
}

function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}
function fmtFecha(inicio: string, fin: string) {
  const d1 = new Date(inicio + 'T12:00:00')
  const m1 = SHORT_MONTHS[d1.getMonth()]
  if (!fin || fin === inicio) return `${d1.getDate()} ${m1}`
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) return `${d1.getDate()}–${d2.getDate()} ${m1}`
  return `${d1.getDate()} ${m1} – ${d2.getDate()} ${SHORT_MONTHS[d2.getMonth()]}`
}
function fmtFechaLarga(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} de ${ALL_MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`
}

// ─── Month drum-roll ──────────────────────────────────────────────────────────
function MonthPicker({ months, active, onChange }: { months: number[]; active: number; onChange: (m: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(360)
  const touchX = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const navigate = useCallback((delta: number) => {
    const idx = months.indexOf(active)
    const next = Math.max(0, Math.min(months.length - 1, idx + delta))
    onChange(months[next])
  }, [active, months, onChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') navigate(-1); if (e.key === 'ArrowRight') navigate(1) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const offset = w / 2 - active * ITEM_W - ITEM_W / 2
  const idx = months.indexOf(active)

  return (
    <div className="relative mb-8 select-none">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-paper to-transparent" />
      <button onClick={() => navigate(-1)} disabled={idx <= 0} aria-label="Mes anterior" className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center text-ink/30 hover:text-ink disabled:opacity-20 transition-colors">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div ref={ref} className="overflow-hidden py-2"
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => { const s = Math.round(-(e.changedTouches[0].clientX - touchX.current) / (ITEM_W * 0.6)); if (s) navigate(s) }}>
        <div className="flex items-center" style={{ transform: `translateX(${offset}px)`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1)' }}>
          {ALL_MONTHS.map((name, i) => {
            const on = i === active
            const has = months.includes(i)
            const dist = Math.abs(i - active)
            const opacity = on ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.22 : 0.07
            const scale = on ? 1 : dist === 1 ? 0.8 : 0.65
            return (
              <button key={i} onClick={() => has && onChange(i)} disabled={!has}
                style={{ width: ITEM_W, opacity, transform: `scale(${scale})`, transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 300ms ease' }}
                className="flex-none flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-default">
                <span className={`rounded-full px-3.5 py-1 font-brand font-bold text-sm whitespace-nowrap transition-colors ${on ? 'bg-mint text-ink' : 'text-ink/55'}`}>
                  {on ? name : SHORT_MONTHS[i]}
                </span>
                <span className={`w-1 h-1 rounded-full ${on ? 'bg-mint' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>
      <button onClick={() => navigate(1)} disabled={idx >= months.length - 1} aria-label="Mes siguiente" className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center text-ink/30 hover:text-ink disabled:opacity-20 transition-colors">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function CompCard({ c, onOpen }: { c: RfeaCompeticion; onOpen: () => void }) {
  const dot = c.disciplina ? DISC_DOT[c.disciplina] : null
  const eventos = pruebasUnicas(c.pruebas)
  return (
    <button onClick={onOpen} className="group text-left flex flex-col gap-2 rounded-xl border border-ink/[0.08] bg-paper px-4 py-3.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(13,42,20,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums text-ink/60">{fmtFecha(c.fecha_inicio, c.fecha_fin)}</span>
        {dot && c.disciplina && (
          <span className="flex items-center gap-1 text-ink/45">
            <span className={`w-[5px] h-[5px] rounded-full ${dot}`} />
            <span className="font-mono text-[0.55rem] tracking-widest uppercase">{c.disciplina}</span>
          </span>
        )}
        {c.inscripcion?.abierta && (
          <span className="ml-auto rounded-full bg-mint/20 px-2 py-0.5 font-mono text-[0.52rem] tracking-widest uppercase text-ink/60">Inscripción abierta</span>
        )}
      </div>
      <p className="text-[0.85rem] font-semibold text-ink leading-snug">{c.nombre}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.58rem] tracking-wide text-ink/35 uppercase truncate">
          {c.lugar ?? ''}
        </span>
        <span className="shrink-0 font-mono text-[0.58rem] tracking-wide text-ink/40 uppercase">
          {eventos.length} prueba{eventos.length === 1 ? '' : 's'} →
        </span>
      </div>
    </button>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function LinkRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-ink/[0.1] bg-paper px-4 py-3 hover:border-ink/25 hover:bg-cream/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {sub && <p className="font-mono text-[0.56rem] tracking-wider text-ink/35 uppercase mt-0.5 truncate">{sub}</p>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink/30"><path d="M7 17L17 7M7 7h10v10" /></svg>
    </a>
  )
}

function Modal({ c, onClose }: { c: RfeaCompeticion; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const eventos = pruebasUnicas(c.pruebas)
  const insc = c.inscripcion ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" aria-hidden="true" />
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={c.nombre}
        className="relative w-full sm:max-w-lg max-h-[88vh] overflow-auto rounded-t-2xl sm:rounded-2xl bg-paper shadow-[0_24px_60px_rgba(13,42,20,0.25)]">
        {/* Header */}
        <div className="sticky top-0 bg-ink px-5 pt-5 pb-4 z-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="font-mono text-[0.6rem] tracking-widest uppercase text-mint/70">
              {fmtFecha(c.fecha_inicio, c.fecha_fin)}{c.disciplina ? ` · ${c.disciplina}` : ''}
            </p>
            <button onClick={onClose} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-full text-cream/40 hover:text-cream hover:bg-cream/10 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <h2 className="font-brand text-xl font-extrabold tracking-brand text-cream leading-snug">{c.nombre}</h2>
          {c.lugar && <p className="mt-1 font-mono text-[0.62rem] tracking-wider text-cream/50 uppercase">{c.lugar}{c.ambito ? ` · ${c.ambito || 'Autonómico'}` : ''}</p>}
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          {/* Inscripción */}
          {(insc.abierta || insc.fecha_limite || insc.url) && (
            <section>
              <p className="font-mono text-[0.58rem] tracking-widest uppercase text-ink/35 mb-2">Inscripción</p>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {insc.abierta && <span className="rounded-full bg-mint/20 px-2.5 py-0.5 font-mono text-[0.56rem] tracking-widest uppercase text-ink/65">Abierta</span>}
                {insc.fecha_limite && (
                  <span className="rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-[0.56rem] tracking-widest uppercase text-ink/60">
                    Hasta {fmtFechaLarga(insc.fecha_limite)}
                  </span>
                )}
              </div>
              {insc.instrucciones && <p className="text-xs text-ink/50 leading-relaxed mb-2">{insc.instrucciones}</p>}
              {insc.url && <LinkRow href={insc.url} label="Inscribirse" sub={insc.url.replace(/^https?:\/\//, '')} />}
            </section>
          )}

          {/* Pruebas */}
          {eventos.length > 0 && (
            <section>
              <p className="font-mono text-[0.58rem] tracking-widest uppercase text-ink/35 mb-2">Pruebas disponibles · {eventos.length}</p>
              <div className="flex flex-wrap gap-1.5">
                {eventos.map(e => (
                  <span key={e} className="rounded-lg border border-ink/[0.1] bg-cream/40 px-2 py-1 font-mono text-[0.6rem] text-ink/70">{e}</span>
                ))}
              </div>
            </section>
          )}

          {/* Enlaces */}
          <section className="flex flex-col gap-2">
            <p className="font-mono text-[0.58rem] tracking-widest uppercase text-ink/35 mb-0.5">Información</p>
            {c.url_detalle && <LinkRow href={c.url_detalle} label="Toda la info en la RFEA" sub="atletismorfea.es" />}
            {c.url_inscritos && <LinkRow href={c.url_inscritos} label="Lista de inscritos" sub="start list oficial" />}
            {c.url_resultados && <LinkRow href={c.url_resultados} label="Resultados" sub="PDF oficial" />}
            {c.url_directo && <LinkRow href={c.url_directo} label="Seguir en directo" sub="streaming / live" />}
          </section>

          {/* Documentos */}
          {c.documentos?.length > 0 && (
            <section>
              <p className="font-mono text-[0.58rem] tracking-widest uppercase text-ink/35 mb-2">Documentos</p>
              <div className="flex flex-col gap-1.5">
                {c.documentos.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ink/60 hover:text-ink transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink/30"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    <span className="truncate">{d.nombre}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function RfeaCalendar({ competiciones }: { competiciones: RfeaCompeticion[] }) {
  const meses = useMemo(
    () => Array.from(new Set(competiciones.map(c => getMes(c.fecha_inicio)))).sort((a, b) => a - b),
    [competiciones],
  )
  const def = (() => { const n = new Date().getMonth(); return meses.includes(n) ? n : (meses[0] ?? 0) })()
  const [mes, setMes] = useState(def)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<RfeaCompeticion | null>(null)

  const filtered = useMemo(() => {
    let list = competiciones.filter(c => getMes(c.fecha_inicio) === mes)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter(c => c.nombre.toLowerCase().includes(s) || (c.lugar?.toLowerCase().includes(s) ?? false))
    }
    return list.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.nombre.localeCompare(b.nombre))
  }, [competiciones, mes, q])

  return (
    <div>
      {open && <Modal c={open} onClose={() => setOpen(null)} />}

      <MonthPicker months={meses} active={mes} onChange={setMes} />

      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-brand text-2xl font-extrabold tracking-brand text-ink">{ALL_MONTHS[mes]}</h2>
        <span className="font-mono text-[0.6rem] tracking-widest text-ink/28 uppercase">{filtered.length} competiciones</span>
        <input
          value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Buscar…"
          className="ml-auto w-40 sm:w-56 rounded-full border border-ink/[0.15] bg-cream/60 px-3.5 py-1.5 text-xs text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-mint/40"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => <CompCard key={c.id ?? i} c={c} onOpen={() => setOpen(c)} />)}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-ink/[0.08] bg-cream/40 py-16">
          <p className="font-mono text-sm text-ink/30">Sin competiciones este mes</p>
        </div>
      )}
    </div>
  )
}
