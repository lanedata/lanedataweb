'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Props {
  id: string
  title: string
  onDeleted?: () => void
}

export function DeleteButton({ id, title, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    await createClient().from('articles').delete().eq('id', id)
    onDeleted?.()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="label-mono text-red-500/60 hover:text-red-600 transition-colors disabled:opacity-40"
    >
      {loading ? '…' : 'Borrar'}
    </button>
  )
}
