'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Counts {
  published: number
  drafts: number
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [erroresNuevos, setErroresNuevos] = useState<number | null>(null)

  useEffect(() => {
    createClient()
      .from('articles')
      .select('status')
      .then(({ data }) => {
        const rows = data ?? []
        setCounts({
          published: rows.filter((r) => r.status === 'published').length,
          drafts: rows.filter((r) => r.status === 'draft').length,
        })
      })
  }, [])

  // Si la tabla aún no existe (esquema sin aplicar), se queda en null y la
  // tarjeta simplemente no muestra contador.
  useEffect(() => {
    createClient()
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'nuevo')
      .then(({ count, error }) => {
        if (!error) setErroresNuevos(count ?? 0)
      })
  }, [])

  const SECTIONS = [
    {
      href: '/admin/articulos',
      n: '01',
      title: 'Artículos',
      desc: 'Sube, edita y publica los análisis. Portada, categoría, extracto y cuerpo HTML.',
      meta: counts
        ? `${counts.published} publicados · ${counts.drafts} borradores`
        : '…',
      cta: 'Gestionar artículos',
    },
    {
      href: '/admin/calendario',
      n: '02',
      title: 'Calendario',
      desc: 'Competiciones de la RFEA y las federaciones. Vincula cada prueba con su análisis.',
      meta: 'Se refresca solo cada día',
      cta: 'Abrir calendario',
    },
    {
      href: '/admin/estudio',
      n: '03',
      title: 'Estudio IG',
      desc: 'Carruseles 1080×1350 con la identidad de lanedata. Exporta los PNG y el caption.',
      meta: 'Formato carrusel · 4:5',
      cta: 'Abrir estudio',
    },
    {
      href: '/admin/historias',
      n: '04',
      title: 'Historias',
      desc: 'Historias 1080×1920 del resumen semanal: portada, récords, top 5, mínimas y destacados.',
      meta: 'Formato story · 9:16',
      cta: 'Abrir generador',
    },
    {
      href: '/admin/dato',
      n: '05',
      title: 'Dato de la semana',
      desc: 'La efeméride de la semana: columna en la web y story 1080×1920 con foto y 4 variantes.',
      meta: 'Formato story · 9:16',
      cta: 'Abrir generador',
    },
    {
      href: '/admin/analiticas',
      n: '06',
      title: 'Analíticas',
      desc: 'Cuánta gente entra, de qué países, qué lee, cuánto se queda y qué calculadoras usa.',
      meta: 'Medición propia · sin cookies',
      cta: 'Ver audiencia',
    },
    {
      href: '/admin/errores',
      n: '07',
      title: 'Errores',
      desc: 'Todo lo que falla en el navegador de quien visita la web, agrupado y exportable a CSV.',
      meta:
        erroresNuevos === null
          ? 'Exportable a CSV'
          : erroresNuevos === 0
            ? 'Nada sin revisar'
            : `${erroresNuevos} sin revisar`,
      cta: 'Revisar errores',
    },
  ]

  return (
    <div>
      <div className="section-label">panel · lanedata</div>
      <h1 className="section-title text-ink">Administración</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/55 leading-relaxed">
        Todo lo que se publica en lanedata sale de aquí. Recuerda pulsar
        <span className="font-semibold text-ink/75"> Publicar web </span>
        arriba a la derecha cuando quieras que los cambios lleguen al sitio.
      </p>

      <div className="mt-12 grid gap-px bg-ink/[0.14] sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col bg-paper p-7 transition-colors duration-150 hover:bg-cream"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="label-mono text-ink/30">{s.n}</span>
              <span className="label-mono text-ink/35">{s.meta}</span>
            </div>
            <h2 className="mt-5 font-brand text-3xl font-extrabold tracking-[-0.04em] leading-none text-ink">
              {s.title}
            </h2>
            <p className="mt-3 text-sm text-ink/55 leading-relaxed">{s.desc}</p>
            <span className="mt-auto flex items-center justify-between gap-2 border-t border-ink/[0.14] pt-4 label-mono text-ink/45 group-hover:text-ink transition-colors">
              {s.cta}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true"
                className="text-ink/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink/60">
                <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
