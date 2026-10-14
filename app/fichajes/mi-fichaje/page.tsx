import type { Metadata } from 'next'
import { FormularioFichaje } from '@/components/fichajes/FormularioFichaje'

// TEMPORAL — Para que el propio atleta cuente su fichaje. Sin clave: por eso
// NO se publica solo, va a revisión en /admin/fichajes. noindex igualmente: se
// comparte por enlace (bio de Instagram, historias), no desde buscadores.
export const metadata: Metadata = {
  title: 'Cuéntanos tu fichaje',
  description: '¿Cambias de club la próxima temporada? Cuéntaselo a lanedata.',
  robots: { index: false, follow: false },
}

export default function MiFichajePage() {
  return (
    <main className="min-h-dvh bg-cream/30">
      <FormularioFichaje modo="atleta" />
    </main>
  )
}
