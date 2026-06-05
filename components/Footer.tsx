import Link from 'next/link'

const monoBase = 'font-mono text-[0.6875rem] tracking-[0.22em] uppercase'

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-ink/[0.1] bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg viewBox="0 0 200 200" width="44" height="44" aria-hidden="true" className="shrink-0">
                <rect width="200" height="200" rx="44" fill="#9FE88D" />
                <ellipse cx="74" cy="108" rx="18" ry="26" fill="#0D2A14" />
                <ellipse cx="126" cy="108" rx="18" ry="26" fill="#0D2A14" />
                <circle cx="67" cy="96" r="5.5" fill="#9FE88D" />
                <circle cx="119" cy="96" r="5.5" fill="#9FE88D" />
              </svg>
              <p className="font-brand text-2xl font-extrabold tracking-brand text-cream">
                lanedata
              </p>
            </div>
            <p className={`${monoBase} text-mint`}>
              El atletismo español con datos
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Pie de página">
            <Link href="/" className={`${monoBase} text-cream/70 hover:text-cream transition-colors`}>
              Inicio
            </Link>
            <Link href="/buscar" className={`${monoBase} text-cream/70 hover:text-cream transition-colors`}>
              Buscar
            </Link>
            <a
              href="https://www.instagram.com/lanedata/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de lanedata"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              <InstagramIcon />
            </a>
          </nav>
        </div>

        <div className="mt-10 border-t border-cream/[0.15] pt-6">
          <p className={`${monoBase} text-cream/50`}>
            © {year} lanedata · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  )
}
