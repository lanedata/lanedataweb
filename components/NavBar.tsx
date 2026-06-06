'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const RANKINGS_URL = 'https://mundoatletismo.es/?skin=lane#/'
const INSTAGRAM_URL = 'https://www.instagram.com/lanedata/'

function TrackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="none" strokeLinejoin="round">
        <rect x="10" y="18" width="80" height="64" rx="32" stroke="#12331C" strokeWidth="3.4"/>
        <rect x="20" y="28" width="60" height="44" rx="22" stroke="#12331C" strokeWidth="3.4"/>
        <rect x="30" y="38" width="40" height="24" rx="12" stroke="#34804A" strokeWidth="3.8"/>
      </g>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.1] bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo — en móvil solo el mark, en desktop mark + texto */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="lanedata — inicio">
          <svg viewBox="0 0 200 200" width="32" height="32" aria-hidden="true" className="shrink-0">
            <rect width="200" height="200" rx="44" fill="#9FE88D" />
            <ellipse cx="74" cy="108" rx="18" ry="26" fill="#0D2A14" />
            <ellipse cx="126" cy="108" rx="18" ry="26" fill="#0D2A14" />
            <circle cx="67" cy="96" r="5.5" fill="#9FE88D" />
            <circle cx="119" cy="96" r="5.5" fill="#9FE88D" />
          </svg>
          <span className="font-brand text-xl font-extrabold tracking-brand text-ink">
            lanedata
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex" aria-label="Navegación principal">
          <NavLink href="/" active={pathname === '/'}>Inicio</NavLink>
          <NavLink href="/buscar" active={pathname === '/buscar'}>Buscar</NavLink>
          <a
            href={RANKINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.15] bg-mint/20 px-3 py-1 label-mono text-ink/70 hover:bg-mint/35 hover:text-ink transition-colors"
          >
            <TrackIcon size={13} />
            Ranking: Mundo Atletismo
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de lanedata"
            className="text-ink/40 hover:text-ink transition-colors"
          >
            <InstagramIcon />
          </a>
        </nav>

        {/* Mobile: píldora corta "Ranking" + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <a
            href={RANKINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.15] bg-mint/20 px-3 py-1.5 label-mono text-ink/70 hover:bg-mint/35 hover:text-ink transition-colors"
          >
            <TrackIcon size={12} />
            Mundo Atletismo
          </a>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md"
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
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu-enter border-t border-ink/[0.1] bg-paper px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-3">
            <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>Inicio</MobileNavLink>
            <MobileNavLink href="/buscar" onClick={() => setMenuOpen(false)}>Buscar</MobileNavLink>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 label-mono text-ink/60 hover:text-ink transition-colors"
            >
              <InstagramIcon />
              Instagram
            </a>
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
      className={`label-mono transition-colors ${active ? 'text-ink' : 'text-ink/50 hover:text-ink/80'}`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="label-mono text-ink/60 hover:text-ink">
      {children}
    </Link>
  )
}
