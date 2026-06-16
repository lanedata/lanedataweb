'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const RANKINGS_URL = 'https://mundoatletismo.es/#/?skin=lane'
const INSTAGRAM_URL = 'https://www.instagram.com/lanedata/'

const NAV_LINKS = [
  { href: '/',           label: 'Inicio' },
  { href: '/archivo',    label: 'Archivo' },
  { href: '/buscar',     label: 'Buscar' },
  { href: '/calendario', label: 'Calendario' },
  { href: '/lanelab',    label: 'LaneLab' },
]

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

  // Lock body scroll while the menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.1] bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="lanedata — inicio" onClick={() => setMenuOpen(false)}>
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

        {/* Hamburger — única acción en la barra */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-ink/[0.05] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="2" y1="2" x2="18" y2="14" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round"/>
                <line x1="18" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <line x1="1" y1="3" x2="19" y2="3" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round"/>
                <line x1="1" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round"/>
                <line x1="1" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="mobile-menu-enter border-t border-ink/[0.1] bg-paper">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
            <nav className="flex flex-col gap-1" aria-label="Navegación principal">
              {NAV_LINKS.map(link => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2.5 font-brand text-lg font-bold tracking-tight transition-colors ${
                      active ? 'text-ink bg-mint/15' : 'text-ink/55 hover:text-ink hover:bg-ink/[0.03]'
                    }`}
                  >
                    {link.label}
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true"
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 text-ink/30">
                      <path d="M1 5h12M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-5 pt-5 border-t border-ink/[0.08] flex flex-wrap items-center gap-3">
              <a
                href={RANKINGS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.15] bg-mint/20 px-3.5 py-1.5 label-mono text-ink/70 hover:bg-mint/35 hover:text-ink transition-colors"
              >
                <TrackIcon size={13} />
                Ranking: Mundo Atletismo
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                aria-label="Instagram de lanedata"
                className="inline-flex items-center gap-2 rounded-full border border-ink/[0.15] px-3.5 py-1.5 label-mono text-ink/60 hover:text-ink hover:border-ink/30 transition-colors"
              >
                <InstagramIcon />
                Instagram
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
