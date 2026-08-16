'use client'

// Un único punto de enganche para errores y analítica. Va montado en el layout
// raíz, así que vive durante toda la navegación (Next no lo desmonta al cambiar
// de página) y por eso puede medir la sesión entera.
//
// El consentimiento no se comprueba aquí: cada envío lo consulta por su cuenta,
// así que retirar el permiso surte efecto en el acto sin recargar.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { installErrorTracking } from '@/lib/telemetry/errors'
import { installAnalytics, trackPageview } from '@/lib/telemetry/analytics'

export function Telemetry() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  // Cazadores globales: se instalan una sola vez.
  useEffect(() => {
    const uninstallErrors = installErrorTracking()
    const uninstallAnalytics = installAnalytics()
    return () => {
      uninstallAnalytics()
      uninstallErrors()
    }
  }, [])

  // Una vista por navegación, incluidas las del enrutado cliente.
  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return
    lastPath.current = pathname
    // El <title> lo pone Next después de pintar; un turno de margen basta.
    const id = window.setTimeout(() => trackPageview(pathname), 0)
    return () => window.clearTimeout(id)
  }, [pathname])

  return null
}
