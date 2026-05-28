'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id: string
  title: string
}

export function DeleteButton({ id, title }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('articles').delete().eq('id', id)
    router.refresh()
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
