'use client'

// Acceso al panel: SOLO con Google. Sin contraseñas no hay fuerza bruta que
// valga, y quién es admin lo decide la tabla `admins` (supabase/roles-schema.sql),
// no el hecho de tener sesión: app/admin/layout.tsx lo comprueba al entrar.

import { createClient } from '@/lib/supabase/client'
import { BotonGoogle } from '@/components/fichajes/PanelColaborador'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pedido = searchParams.get('next') ?? '/admin/'
  // Solo rutas del propio sitio: nada de ?next=https://otro-sitio.
  const next = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/admin/'

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Si Google falla (o el correo no está en la lista), Supabase vuelve con el error en la URL.
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const fallo = p.get('error_description') ?? p.get('error')
    if (fallo) setError(fallo.replace(/\+/g, ' '))

    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next)
    })
  }, [router, next])

  async function conGoogle() {
    setError('')
    setLoading(true)
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}`, queryParams: { prompt: 'select_account' } },
    })
    // Si va bien, el navegador se va a Google y no se llega aquí.
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-brand text-3xl font-extrabold tracking-brand text-ink">lanedata</p>
          <p className="mt-1 label-mono text-ink/40">Panel de administración</p>
        </div>

        <BotonGoogle onClick={conGoogle} ocupado={loading} />

        {error && (
          <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="mt-5 text-center text-[0.78rem] leading-relaxed text-ink/45">
          Solo entran las cuentas de administrador.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
