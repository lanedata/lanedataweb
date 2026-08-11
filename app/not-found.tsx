import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-32 text-center sm:px-6">
        <p className="font-brand text-8xl font-extrabold tracking-brand text-ink/10 leading-none select-none">
          404
        </p>
        <h1 className="mt-4 font-brand text-2xl font-bold tracking-tight text-ink">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-ink/45">
          La URL no existe o el artículo ha sido eliminado.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 bg-ink px-6 py-3 font-brand text-sm font-bold tracking-tight text-cream transition-colors duration-150 hover:bg-mint hover:text-ink"
        >
          Volver al inicio
        </Link>
      </main>
      <Footer />
    </>
  )
}
