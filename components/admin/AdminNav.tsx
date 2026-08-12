'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REBUILD_URL =
  'https://github.com/lanedata/lanedataweb/actions/workflows/deploy.yml'

/** Secciones del panel. `match` decide el estado activo con las subrutas. */
const SECTIONS = [
  { href: '/admin/articulos', label: 'Artículos', match: ['/admin/articulos', '/admin/nuevo', '/admin/editar'] },
  { href: '/admin/calendario', label: 'Calendario', match: ['/admin/calendario'] },
  { href: '/admin/estudio', label: 'Estudio IG', match: ['/admin/estudio'] },
  { href: '/admin/historias', label: 'Historias', match: ['/admin/historias'] },
  { href: '/admin/dato', label: 'Dato semana', match: ['/admin/dato'] },
]

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
        <div className="flex items-center gap-5">
          <Link
            href="/admin"
            className="font-brand text-lg font-extrabold tracking-brand text-cream"
            aria-label="Panel de administración"
          >
            lanedata
          </Link>
          <span className="label-mono text-mint/70">Admin</span>
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
            Publicar web
          </a>

          <Link
            href="/"
            target="_blank"
            className="hidden label-mono text-cream/40 hover:text-cream transition-colors sm:inline"
          >
            Ver web ↗
          </Link>

          <button
            onClick={logout}
            className="label-mono text-cream/40 hover:text-cream transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Barra de secciones */}
      <nav
        aria-label="Secciones del panel"
        className="border-t border-cream/[0.12] bg-ink"
      >
        <div className="mx-auto flex max-w-6xl items-stretch gap-0 overflow-x-auto px-4 sm:px-6 scrollbar-none">
          {SECTIONS.map((s) => {
            const active = s.match.some((m) => pathname === m || pathname.startsWith(m + '/'))
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 border-b-2 px-4 py-3 label-mono transition-colors ${
                  active
                    ? 'border-mint text-mint'
                    : 'border-transparent text-cream/40 hover:text-cream/75'
                }`}
              >
                {s.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
