'use client'

import { useState } from 'react'
import { EVENTS, trackEvent } from '@/lib/telemetry/analytics'
import { logError } from '@/lib/telemetry/errors'

interface Props {
  title: string
  url: string
}

export function ShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false)

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        trackEvent(EVENTS.share, 'nativo')
        return
      }
      await navigator.clipboard.writeText(url)
      trackEvent(EVENTS.share, 'copiar enlace')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Cancelar el diálogo del sistema lanza AbortError: no es un fallo.
      if (e instanceof DOMException && e.name === 'AbortError') return
      logError({ error: e, action: 'compartir un artículo', context: { url } })
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 border border-ink/[0.14] px-4 py-2.5 label-mono text-ink/60 transition-colors duration-150 hover:bg-ink hover:text-mint hover:border-ink"
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M1 7l3.5 3.5L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M9 1H12V4M12 1L7 6M5 3H2V11H10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Compartir
        </>
      )}
    </button>
  )
}
