'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REBUILD_URL =
  'https://github.com/mateogsilvaa/lanedata/actions/workflows/deploy.yml'

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
    <header className="sticky top-0 z-50 border-b border-ink/[0.1] bg-ink">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-brand text-lg font-extrabold tracking-brand text-cream"
            target="_blank"
            aria-label="Ver sitio público"
          >
            lanedata
          </Link>

          <span className="hidden label-mono text-cream/20 sm:inline">Admin</span>

          <nav className="hidden items-center gap-4 sm:flex">
            <AdminNavLink href="/admin" active={pathname === '/admin'}>
              Artículos
            </AdminNavLink>
            <AdminNavLink href="/admin/nuevo" active={pathname === '/admin/nuevo'}>
              + Nuevo
            </AdminNavLink>
            <AdminNavLink href="/admin/calendario" active={pathname === '/admin/calendario'}>
              Calendario
            </AdminNavLink>
            <AdminNavLink href="/admin/estudio" active={pathname === '/admin/estudio'}>
              Estudio IG
            </AdminNavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Rebuild button — opens GitHub Actions Run workflow page */}
          <a
            href={REBUILD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-mint/20 px-3 py-1.5 label-mono text-mint hover:bg-mint/30 transition-colors"
            title="Abre GitHub Actions para lanzar un rebuild del sitio"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Publicar web
          </a>

          <button
            onClick={logout}
            className="label-mono text-cream/35 hover:text-cream/60 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}

function AdminNavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`label-mono transition-colors ${
        active ? 'text-cream' : 'text-cream/40 hover:text-cream/65'
      }`}
    >
      {children}
    </Link>
  )
}
