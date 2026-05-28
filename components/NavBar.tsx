'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.1] bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo: mark + wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="lanedata — inicio"
        >
          <svg
            viewBox="0 0 200 200"
            width="32"
            height="32"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="100" cy="100" r="100" fill="#9FE88D" />
            <ellipse cx="74" cy="100" rx="14" ry="22" fill="#0D2A14" />
            <ellipse cx="126" cy="100" rx="14" ry="22" fill="#0D2A14" />
            <circle cx="78" cy="92" r="4" fill="#9FE88D" />
            <circle cx="130" cy="92" r="4" fill="#9FE88D" />
          </svg>
          <span className="font-brand text-xl font-extrabold tracking-brand text-ink">
            lanedata
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex" aria-label="Navegación principal">
          <NavLink href="/" active={pathname === '/'}>Inicio</NavLink>
          <NavLink href="/buscar" active={pathname === '/buscar'}>Buscar</NavLink>
        </nav>

        {/* Mobile toggle */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span className="sr-only">{menuOpen ? 'Cerrar' : 'Menú'}</span>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="1" y1="1" x2="17" y2="13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="17" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="0" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-ink/[0.1] bg-paper px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-3">
            <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>Inicio</MobileNavLink>
            <MobileNavLink href="/buscar" onClick={() => setMenuOpen(false)}>Buscar</MobileNavLink>
          </nav>
        </div>
      )}
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`label-mono transition-colors ${
        active ? 'text-ink' : 'text-ink/50 hover:text-ink/80'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="label-mono text-ink/60 hover:text-ink"
    >
      {children}
    </Link>
  )
}
