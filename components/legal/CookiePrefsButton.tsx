'use client'

// Reabre el panel de cookies. Va suelto en su propio fichero para que las
// páginas legales sigan siendo componentes de servidor.

import { openCookiePreferences } from '@/components/telemetry/CookieBanner'

export function CookiePrefsButton({
  children = 'Cambiar mis preferencias de cookies',
  variant = 'boton',
}: {
  children?: React.ReactNode
  variant?: 'boton' | 'enlace'
}) {
  if (variant === 'enlace') {
    return (
      <button
        onClick={openCookiePreferences}
        className="font-mono text-[0.6875rem] tracking-[0.22em] uppercase text-cream/70 transition-colors hover:text-cream"
      >
        {children}
      </button>
    )
  }

  return (
    <button
      onClick={openCookiePreferences}
      className="inline-flex items-center gap-2 bg-ink px-6 py-3 font-brand text-sm font-bold tracking-tight text-cream transition-colors duration-150 hover:bg-mint hover:text-ink"
    >
      {children}
    </button>
  )
}
