'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const RANKINGS_URL = 'https://mundoatletismo.es/#/?skin=lane'
const INSTAGRAM_URL = 'https://www.instagram.com/lanedata/'

// /calendario sigue existiendo y funcionando, pero ya no es una sección pública:
// se quitó de aquí, del sitemap y se marcó noindex (ver app/calendario/page.tsx).
const NAV_LINKS = [
  { href: '/',        label: 'Inicio' },
  { href: '/archivo', label: 'Archivo' },
  { href: '/lanelab', label: 'LaneLab' },
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

function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="lanedata — inicio" onClick={() => setMenuOpen(false)}>
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

        {/* Acciones rápidas + menú */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mundo Atletismo */}
          <a
            href={RANKINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ranking: Mundo Atletismo"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.15] bg-mint/20 px-2.5 sm:px-3 py-1.5 label-mono text-ink/70 hover:bg-mint/35 hover:text-ink transition-colors"
          >
            <TrackIcon size={13} />
            <span className="sm:hidden">MA: Ranking</span>
            <span className="hidden sm:inline">Mundo Atletismo</span>
          </a>

          {/* Instagram */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de lanedata"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.05] transition-colors"
          >
            <InstagramIcon />
          </a>

          {/* Hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-ink/[0.05] transition-colors"
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
      </div>

      {/* ── Menú desplegable editorial ─────────────────────────────────────── */}
      {menuOpen && (
        <div className="mobile-menu-enter border-t border-ink/[0.1] bg-paper">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-7 sm:py-9">
            <nav aria-label="Navegación principal">
              {NAV_LINKS.map((link, i) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className={`menu-item group flex items-center gap-4 sm:gap-6 border-b border-ink/[0.07] py-3.5 sm:py-4 transition-colors ${
                      active ? 'text-ink' : 'text-ink/70 hover:text-ink'
                    }`}
                  >
                    {/* Índice */}
                    <span className={`font-mono text-[0.7rem] tabular-nums w-7 shrink-0 transition-colors ${
                      active ? 'text-mint' : 'text-ink/25 group-hover:text-mint'
                    }`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Etiqueta */}
                    <span className="font-brand text-3xl sm:text-4xl font-extrabold tracking-brand leading-none transition-transform duration-200 group-hover:translate-x-1">
                      {link.label}
                    </span>

                    {/* Punto activo / flecha */}
                    {active ? (
                      <span className="ml-auto h-2 w-2 rounded-full bg-mint shrink-0" aria-hidden="true" />
                    ) : (
                      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true"
                        className="ml-auto shrink-0 text-ink/20 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                        <path d="M1 7h17M12 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Pie del menú */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <p className="label-mono text-ink/40">El atletismo español con datos</p>
              <div className="flex items-center gap-3">
                <a
                  href={RANKINGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.15] bg-mint/20 px-3 py-1.5 label-mono text-ink/70 hover:bg-mint/35 hover:text-ink transition-colors"
                >
                  <TrackIcon size={13} />
                  Mundo Atletismo
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Instagram de lanedata"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/[0.15] text-ink/55 hover:text-ink hover:border-ink/30 transition-colors"
                >
                  <InstagramIcon size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
