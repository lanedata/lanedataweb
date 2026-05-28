import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-ink/[0.1] bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-brand text-2xl font-extrabold tracking-brand text-cream">
              lanedata
            </p>
            <p className="mt-1 label-mono text-cream/40">
              El atletismo español con datos
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pie de página">
            <Link href="/" className="label-mono text-cream/40 hover:text-cream/70 transition-colors">
              Inicio
            </Link>
            <Link href="/buscar" className="label-mono text-cream/40 hover:text-cream/70 transition-colors">
              Buscar
            </Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-cream/[0.1] pt-6">
          <p className="label-mono text-cream/25">
            © {year} lanedata · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  )
}
