'use client'

// Static export: auth is checked client-side (no server middleware on GitHub Pages)
import { AdminNav } from '@/components/admin/AdminNav'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })

    // Re-check if the session changes (e.g. token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <span className="font-brand text-sm text-ink/30">Verificando acceso…</span>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  )
}
