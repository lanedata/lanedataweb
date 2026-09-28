import type { Metadata } from 'next'
import { EnviarFichaje } from '@/components/fichajes/EnviarFichaje'

// TEMPORAL — Enlace que se comparte con los colaboradores del mercado de
// fichajes. No es una sección pública: noindex aquí y Disallow en robots.ts.
// La clave la valida Postgres, no este código (ver componente y
// supabase/fichajes-schema.sql).
export const metadata: Metadata = {
  title: 'Avisar de un fichaje',
  description: 'Formulario para colaboradores de lanedata.',
  robots: { index: false, follow: false },
}

export default function EnviarFichajePage() {
  return (
    <main className="min-h-dvh bg-paper">
      <EnviarFichaje />
    </main>
  )
}
