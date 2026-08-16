'use client'

// Último cortafuegos: un error en el propio layout raíz. Aquí no existen ni la
// NavBar ni los estilos de la app, así que va todo en línea y sin dependencias.

import { useEffect } from 'react'
import { logError } from '@/lib/telemetry/errors'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError({
      error,
      source: 'react',
      action: 'pintando el layout raíz',
      severity: 'error',
      context: error.digest ? { digest: error.digest } : undefined,
    })
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBFAF6',
          color: '#0D2A14',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            lanedata no ha podido cargar
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', opacity: 0.55 }}>
            El error ya ha quedado registrado. Recarga la página para volver a intentarlo.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1.75rem',
              border: 'none',
              cursor: 'pointer',
              background: '#0D2A14',
              color: '#F4F1EA',
              padding: '0.85rem 1.6rem',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
