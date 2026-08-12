'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REBUILD_URL =
  'https://github.com/lanedata/lanedataweb/actions/workflows/deploy.yml'

/** Secciones del panel. `match` decide el estado activo con las subrutas. */
const SECTIONS = [
  { href: '/admin/articulos', label: 'Artículos', icon: 'doc', match: ['/admin/articulos', '/admin/nuevo', '/admin/editar'] },
  { href: '/admin/calendario', label: 'Calendario', icon: 'cal', match: ['/admin/calendario'] },
  { href: '/admin/estudio', label: 'Estudio IG', icon: 'grid', match: ['/admin/estudio'] },
  { href: '/admin/historias', label: 'Historias', icon: 'story', match: ['/admin/historias'] },
  { href: '/admin/dato', label: 'Dato semana', icon: 'star', match: ['/admin/dato'] },
] as const

function SectionIcon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'doc':
      return <svg {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></svg>
    case 'cal':
      return <svg {...p}><rect x="4" y="5" width="16" height="16" rx="1.5" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>
    case 'grid':
      return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 15l4-4 4 4 3-3 5 5" /><circle cx="9" cy="9" r="1.4" /></svg>
    case 'story':
      return <svg {...p}><rect x="7" y="3" width="10" height="18" rx="1.5" /><path d="M12 8v8M9 12h6" /></svg>
    case 'star':
      return <svg {...p}><path d="M12 4l2.2 4.8L19 9.6l-3.5 3.4.9 5L12 15.6 7.6 18l.9-5L5 9.6l4.8-.8z" /></svg>
    default:
      return null
  }
}

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-ink">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2.5"
            aria-label="Inicio del panel de administración"
          >
            <svg viewBox="0 0 200 200" width="26" height="26" aria-hidden="true" className="shrink-0">
              <rect width="200" height="200" rx="44" fill="#9FE88D" />
              <ellipse cx="74" cy="108" rx="18" ry="26" fill="#0D2A14" />
              <ellipse cx="126" cy="108" rx="18" ry="26" fill="#0D2A14" />
              <circle cx="67" cy="96" r="5.5" fill="#9FE88D" />
              <circle cx="119" cy="96" r="5.5" fill="#9FE88D" />
            </svg>
            <span className="font-brand text-lg font-extrabold tracking-brand text-cream">lanedata</span>
          </Link>
          <span className="hidden label-mono text-mint/70 sm:inline">Admin</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={REBUILD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-mint px-3 py-2 label-mono text-ink transition-colors hover:bg-cream"
            title="Abre GitHub Actions para lanzar un rebuild del sitio"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            <span className="hidden sm:inline">Publicar web</span>
            <span className="sm:hidden">Publicar</span>
          </a>

          <Link
            href="/"
            target="_blank"
            className="hidden label-mono text-cream/50 hover:text-cream transition-colors sm:inline"
          >
            Ver web ↗
          </Link>

          <button
            onClick={logout}
            className="label-mono text-cream/50 hover:text-cream transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Barra de secciones: siempre visible, con icono y etiqueta */}
      <nav aria-label="Secciones del panel" className="border-t border-cream/[0.12] bg-ink">
        <div className="mx-auto flex max-w-6xl items-stretch gap-1 overflow-x-auto px-2 sm:px-5 scrollbar-none">
          {SECTIONS.map((s) => {
            const active = s.match.some((m) => pathname === m || pathname.startsWith(m + '/'))
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={`group flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 label-mono transition-colors ${
                  active
                    ? 'border-mint bg-cream/[0.06] text-mint'
                    : 'border-transparent text-cream/60 hover:bg-cream/[0.06] hover:text-cream'
                }`}
              >
                <span className={active ? 'text-mint' : 'text-cream/45 group-hover:text-cream/80 transition-colors'}>
                  <SectionIcon name={s.icon} />
                </span>
                {s.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
