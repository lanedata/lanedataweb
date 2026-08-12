// TEMPORAL — sólo para verificar el generador en local. Borrar.
'use client'

import { JetBrains_Mono } from 'next/font/google'
import { Historias } from '@/components/admin/historias/Historias'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-story-mono',
})

export default function DevHistoriasPage() {
  return (
    <div className={`min-h-dvh bg-paper ${jetbrains.variable}`}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Historias />
      </div>
    </div>
  )
}
