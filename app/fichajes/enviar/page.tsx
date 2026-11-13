import type { Metadata } from 'next'
import { PanelColaborador } from '@/components/fichajes/PanelColaborador'

// TEMPORAL — Zona de colaboradores del mercado de fichajes. El enlace es el
// mismo para todos: cada uno entra con su cuenta de Google y solo pasa si su
// correo está dado de alta en /admin/fichajes. No es una sección pública:
// noindex y Disallow /fichajes.
export const metadata: Metadata = {
  title: 'Colaboradores · Mercado de fichajes',
  description: 'Zona de colaboradores del mercado de fichajes de lanedata.',
  robots: { index: false, follow: false },
}

export default function EnviarFichajePage() {
  return (
    <main className="min-h-dvh bg-cream/30">
      <PanelColaborador />
    </main>
  )
}
