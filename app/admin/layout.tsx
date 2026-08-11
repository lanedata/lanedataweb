'use client'

// Static export: auth is checked client-side (no server middleware on GitHub Pages)
import { AdminNav } from '@/components/admin/AdminNav'
import { createClient } from '@/lib/supabase/client'
import { JetBrains_Mono } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// La usan las tarjetas del generador de historias. Se carga sólo aquí para no
// añadir una fuente más a las páginas públicas.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-story-mono',
})

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
    <div className={`min-h-dvh bg-paper ${jetbrains.variable}`}>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  )
}
