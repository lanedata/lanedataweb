'use client'

// Google Analytics, pero solo si la persona ha dicho que sí.
//
// GA es un tercero que transfiere datos fuera de la UE, así que el script ni
// siquiera se descarga hasta que hay consentimiento: no basta con "cargarlo en
// modo denegado". Si el consentimiento se retira, se desactiva en el acto
// (window['ga-disable-…']) y se borran las cookies que hubiera dejado.

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { effectiveConsent, onConsentChange } from '@/lib/telemetry/consent'

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(effectiveConsent().analytics)
    return onConsentChange((consent) => {
      const yes = consent?.analytics ?? false
      setAllowed(yes)
      if (!yes) disableGa(gaId)
    })
  }, [gaId])

  if (!allowed || !gaId) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  )
}

/** Apaga GA y limpia sus cookies cuando se retira el consentimiento. */
function disableGa(gaId: string) {
  try {
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true
    const host = window.location.hostname
    // _ga, _gid, _ga_XXXXXXX…
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim()
      if (!name.startsWith('_ga') && !name.startsWith('_gid')) return
      for (const domain of [host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`
      }
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    })
  } catch {
    // Si el navegador no deja tocar cookies, GA queda desactivado igualmente.
  }
}
