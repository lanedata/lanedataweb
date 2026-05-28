import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-ink/[0.1] bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg
                viewBox="0 0 200 200"
                width="44"
                height="44"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="100" cy="100" r="100" fill="#9FE88D" />
                <ellipse cx="74" cy="100" rx="14" ry="22" fill="#0D2A14" />
                <ellipse cx="126" cy="100" rx="14" ry="22" fill="#0D2A14" />
                <circle cx="78" cy="92" r="4" fill="#9FE88D" />
                <circle cx="130" cy="92" r="4" fill="#9FE88D" />
              </svg>
              <p className="font-brand text-2xl font-extrabold tracking-brand text-cream">
                lanedata
              </p>
            </div>
            {/* Subtitle con mint para contrastar con el fondo oscuro */}
            <p className="label-mono text-mint/80">
              El atletismo español con datos
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pie de página">
            <Link href="/" className="label-mono text-cream/70 hover:text-cream transition-colors">
              Inicio
            </Link>
            <Link href="/buscar" className="label-mono text-cream/70 hover:text-cream transition-colors">
              Buscar
            </Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-cream/[0.15] pt-6">
          <p className="label-mono text-cream/50">
            © {year} lanedata · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  )
}
