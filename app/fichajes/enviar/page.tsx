import type { Metadata } from 'next'
import { FormularioFichaje } from '@/components/fichajes/FormularioFichaje'

// TEMPORAL — Enlace de colaboradores del mercado de fichajes (con clave, se
// publica al momento). No es una sección pública: noindex y Disallow /fichajes.
export const metadata: Metadata = {
  title: 'Avisar de un fichaje',
  description: 'Formulario para colaboradores del mercado de fichajes de lanedata.',
  robots: { index: false, follow: false },
}

export default function EnviarFichajePage() {
  return (
    <main className="min-h-dvh bg-cream/30">
      <FormularioFichaje modo="colaborador" />
    </main>
  )
}
