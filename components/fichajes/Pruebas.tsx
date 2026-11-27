'use client'

// Pruebas que acompañan a un chivatazo (un enlace y/o un archivo), tal como
// las ven el admin y los colaboradores. El archivo vive en un bucket privado:
// se abre con un enlace firmado que caduca a los 10 minutos.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const BUCKET_CHIVATAZOS = 'chivatazos'

export function Pruebas({ enlace, adjunto }: { enlace?: string | null; adjunto?: string | null }) {
  const [abriendo, setAbriendo] = useState(false)
  const [fallo, setFallo] = useState(false)
  const enlaceOk = enlace && /^https?:\/\//i.test(enlace) ? enlace : null
  if (!enlaceOk && !adjunto) return null

  async function abrir() {
    if (!adjunto) return
    setAbriendo(true); setFallo(false)
    // La pestaña se abre ya (con el toque) para que el navegador no la bloquee.
    const pestana = window.open('', '_blank')
    const { data, error } = await createClient().storage.from(BUCKET_CHIVATAZOS).createSignedUrl(adjunto, 600)
    setAbriendo(false)
    if (error || !data?.signedUrl) { pestana?.close(); setFallo(true); return }
    if (pestana) { pestana.opener = null; pestana.location.href = data.signedUrl }
    else window.location.href = data.signedUrl
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8rem]">
      {enlaceOk && (
        <a href={enlaceOk} target="_blank" rel="noopener noreferrer nofollow"
          className="max-w-full truncate font-semibold text-ink underline decoration-mint decoration-2 underline-offset-4 hover:decoration-ink">
          🔗 {enlaceOk.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 60)}
        </a>
      )}
      {adjunto && (
        <button type="button" onClick={abrir} disabled={abriendo}
          className="font-semibold text-ink underline decoration-mint decoration-2 underline-offset-4 hover:decoration-ink disabled:opacity-50">
          📎 {abriendo ? 'abriendo…' : 'ver archivo adjunto'}
        </button>
      )}
      {fallo && <span className="text-red-700">No se ha podido abrir el archivo.</span>}
    </div>
  )
}
