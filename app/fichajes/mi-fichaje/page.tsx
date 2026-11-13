import type { Metadata } from 'next'
import { FormularioFichaje } from '@/components/fichajes/FormularioFichaje'

// TEMPORAL — La página pública para mandar un fichaje, sin clave: el propio
// atleta cuenta el suyo, o cualquiera da un chivatazo (#chivatazo la abre en
// ese modo). NO se publica solo, va a revisión en /admin/fichajes. noindex igualmente: se
// comparte por enlace (bio de Instagram, historias), no desde buscadores.
export const metadata: Metadata = {
  title: 'Cuéntanos un fichaje',
  description: '¿Cambias de club o te has enterado de un fichaje? Cuéntaselo a lanedata.',
  robots: { index: false, follow: false },
}

export default function MiFichajePage() {
  return (
    <main className="min-h-dvh bg-cream/30">
      <FormularioFichaje modo="atleta" />
    </main>
  )
}
