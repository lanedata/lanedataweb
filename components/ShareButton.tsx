'use client'

import { useState } from 'react'

interface Props {
  title: string
  url: string
}

export function ShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url })
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-ink/[0.15] px-4 py-2 label-mono text-ink/60 transition-colors hover:border-ink/30 hover:text-ink"
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
