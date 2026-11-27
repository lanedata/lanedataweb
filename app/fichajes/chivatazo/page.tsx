import type { Metadata } from 'next'
import { FormularioFichaje } from '@/components/fichajes/FormularioFichaje'

// TEMPORAL — La página pública para mandar un fichaje, sin clave: cualquiera da
// un chivatazo, y con «Es el mío» (#mio) el propio atleta cuenta el suyo. NO se
// publica solo: va a revisión. noindex: se comparte por enlace y desde el directo.
export const metadata: Metadata = {
  title: 'Danos el chivatazo',
  description: '¿Te has enterado de un fichaje del atletismo español, o cambias tú de club? Cuéntaselo a lanedata.',
  robots: { index: false, follow: false },
}

export default function ChivatazoPage() {
  return (
    <main className="min-h-dvh bg-cream/30">
      <FormularioFichaje modo="atleta" />
    </main>
  )
}
