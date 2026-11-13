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
  // Sesión iniciada con una cuenta que no es admin (p. ej. un colaborador).
  const [intruso, setIntruso] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      // Tener sesión no basta: hay que estar en `admins` (roles-schema.sql).
      // Esto solo decide qué se pinta; quien manda es la base de datos, que no
      // le da nada a quien no es admin. PGRST202 = SQL de roles sin aplicar aún.
      const { data: esAdmin, error } = await supabase.rpc('es_admin')
      if (error ? error.code === 'PGRST202' : esAdmin === true) setReady(true)
      else setIntruso(session.user.email ?? 'esta cuenta')
    })

    // Re-check if the session changes (e.g. token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (intruso) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
        <p className="font-brand text-xl font-extrabold tracking-tight text-ink">Esta cuenta no es de administrador</p>
        <p className="max-w-sm text-sm leading-relaxed text-ink/60">
          Has entrado como <strong className="font-semibold text-ink/80">{intruso}</strong>. Si eres colaborador del
          mercado, tu sitio es <a href="/fichajes/enviar/" className="font-semibold text-ink underline decoration-mint decoration-2 underline-offset-4">la zona de colaboradores</a>.
        </p>
        <button type="button" className="border border-ink/25 px-4 py-2 label-mono text-ink/65 transition-colors hover:border-ink hover:text-ink"
          onClick={() => createClient().auth.signOut()}>
          entrar con otra cuenta
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <span className="font-brand text-sm text-ink/30">Verificando acceso…</span>
      </div>
    )
  }

  return (
    <div className={`min-h-dvh bg-paper ${jetbrains.variable}`}>
      {/* App instalable del panel (React 19 sube estas etiquetas al <head>). */}
      <link rel="manifest" href="/admin.webmanifest" />
      <meta name="theme-color" content="#0D2A14" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="lanedata" />
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  )
}
