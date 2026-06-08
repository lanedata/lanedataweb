'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Competition } from '@/types'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const DISCIPLINA_COLORS: Record<string, string> = {
  'Ruta':           'bg-blue-50 text-blue-700 border-blue-200',
  'Cross':          'bg-amber-50 text-amber-700 border-amber-200',
  'Pista Aire Libre': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Trail Running':  'bg-orange-50 text-orange-700 border-orange-200',
  'Short Track':    'bg-violet-50 text-violet-700 border-violet-200',
  'Marcha':         'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Internacional':  'bg-rose-50 text-rose-700 border-rose-200',
}

const AREA_STYLE: Record<string, string> = {
  'WA':   'bg-[#9FE88D]/30 text-[#0D2A14]',
  'EA':   'bg-sky-100 text-sky-800',
  'RFEA': 'bg-ink/8 text-ink/70',
}

function formatFecha(inicio: string, fin: string | null): string {
  const d1 = new Date(inicio + 'T12:00:00')
  if (!fin || fin === inicio) {
    return `${d1.getDate()} ${MESES[d1.getMonth()].slice(0,3).toLowerCase()}`
  }
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) {
    return `${d1.getDate()}–${d2.getDate()} ${MESES[d1.getMonth()].slice(0,3).toLowerCase()}`
  }
  return `${d1.getDate()} ${MESES[d1.getMonth()].slice(0,3).toLowerCase()} – ${d2.getDate()} ${MESES[d2.getMonth()].slice(0,3).toLowerCase()}`
}

function getMes(fecha: string): number {
  return new Date(fecha + 'T12:00:00').getMonth() // 0-based
}

interface Props {
  competitions: Competition[]
}

export function CalendarView({ competitions }: Props) {
  const [mesActivo, setMesActivo] = useState<number | null>(null)

  // Determinar qué meses tienen datos
  const mesesConDatos = Array.from(
    new Set(competitions.map(c => getMes(c.fecha_inicio)))
  ).sort((a, b) => a - b)

  const filtered = mesActivo === null
    ? competitions
    : competitions.filter(c => getMes(c.fecha_inicio) === mesActivo)

  // Agrupar por mes
  const porMes: Record<number, Competition[]> = {}
  for (const c of filtered) {
    const m = getMes(c.fecha_inicio)
    if (!porMes[m]) porMes[m] = []
    porMes[m].push(c)
  }

  return (
    <div>
      {/* ── Filtros de mes ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setMesActivo(null)}
          className={`rounded-full px-3 py-1 text-xs font-mono tracking-widest uppercase transition-colors duration-150 ${
            mesActivo === null
              ? 'bg-ink text-cream'
              : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink'
          }`}
        >
          Todos
        </button>
        {mesesConDatos.map(m => (
          <button
            key={m}
            onClick={() => setMesActivo(m === mesActivo ? null : m)}
            className={`rounded-full px-3 py-1 text-xs font-mono tracking-widest uppercase transition-colors duration-150 ${
              mesActivo === m
                ? 'bg-mint text-ink'
                : 'border border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink'
            }`}
          >
            {MESES[m].slice(0, 3)}
          </button>
        ))}
      </div>

      {/* ── Meses ──────────────────────────────────────────────────────── */}
      <div className="space-y-10">
        {Object.keys(porMes).sort((a,b) => Number(a)-Number(b)).map(mesKey => {
          const mes = Number(mesKey)
          const comps = porMes[mes]
          return (
            <section key={mes}>
              {/* Cabecera de mes */}
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-ink rounded-lg px-4 py-1.5">
                  <span className="font-brand font-extrabold tracking-brand text-mint text-sm uppercase">
                    {MESES[mes]}
                  </span>
                </div>
                <div className="flex-1 h-px bg-ink/10" />
                <span className="font-mono text-[0.65rem] tracking-widest text-ink/40 uppercase">
                  {comps.length} competiciones
                </span>
              </div>

              {/* Lista */}
              <div className="divide-y divide-ink/[0.07] rounded-xl border border-ink/[0.1] overflow-hidden">
                {comps.map((c, i) => (
                  <CompetitionRow key={c.id} comp={c} even={i % 2 === 0} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CompetitionRow({ comp, even }: { comp: Competition; even: boolean }) {
  const discColor = comp.disciplina ? (DISCIPLINA_COLORS[comp.disciplina] ?? 'bg-ink/5 text-ink/70 border-ink/10') : ''
  const areaStyle = comp.area ? (AREA_STYLE[comp.area] ?? 'bg-ink/5 text-ink/60') : ''

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 transition-colors duration-150 hover:bg-mint/5 ${even ? 'bg-paper' : 'bg-cream/40'}`}>
      {/* Fecha */}
      <div className="shrink-0 w-[7.5rem]">
        <span className="font-mono text-[0.7rem] tracking-wider text-ink/60 uppercase">
          {formatFecha(comp.fecha_inicio, comp.fecha_fin)}
        </span>
      </div>

      {/* Disciplina */}
      {comp.disciplina && (
        <span className={`shrink-0 self-start sm:self-auto inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-mono tracking-wider uppercase ${discColor}`}>
          {comp.disciplina}
        </span>
      )}

      {/* Nombre */}
      <p className="flex-1 text-sm font-medium text-ink leading-snug">
        {comp.nombre}
      </p>

      {/* Ciudad + área */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {comp.ciudad && (
          <span className="font-mono text-[0.65rem] tracking-wider text-ink/40 uppercase hidden sm:block">
            {comp.ciudad}
          </span>
        )}
        {comp.area && (
          <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-mono font-semibold tracking-wider uppercase ${areaStyle}`}>
            {comp.area}
          </span>
        )}
      </div>

      {/* Artículo vinculado */}
      {comp.article && (
        <Link
          href={`/articulo/${comp.article.slug}`}
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 font-brand text-[0.7rem] font-bold text-ink hover:bg-mint/80 transition-colors duration-150 active:scale-[0.97]"
        >
          Análisis
          <svg width="9" height="7" viewBox="0 0 12 9" fill="none" aria-hidden="true">
            <path d="M1 4.5h10M7.5 1l3.5 3.5L7.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      )}
    </div>
  )
}
