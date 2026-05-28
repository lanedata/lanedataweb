'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

          <span className="label-mono text-cream/20">Admin</span>

          <nav className="hidden items-center gap-4 sm:flex">
            <AdminNavLink href="/admin" active={pathname === '/admin'}>
              Artículos
            </AdminNavLink>
            <AdminNavLink href="/admin/nuevo" active={pathname === '/admin/nuevo'}>
              + Nuevo
            </AdminNavLink>
          </nav>
        </div>

        <button
          onClick={logout}
          className="label-mono text-cream/35 hover:text-cream/60 transition-colors"
        >
          Cerrar sesión
        </button>
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
