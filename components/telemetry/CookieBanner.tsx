'use client'

// Banner de cookies conforme a la Guía sobre el uso de cookies de la AEPD:
//
//   · "Aceptar" y "Rechazar" con el mismo peso visual, en el primer nivel.
//     Nada de rechazar escondido detrás de dos clics.
//   · Ninguna casilla marcada por defecto en el panel de ajustes.
//   · Se puede cerrar rechazando, nunca por descarte: no hay aspa que valga
//     por un "sí".
//   · Enlace visible a la política de cookies antes de decidir.
//
// Mientras no haya respuesta, no se carga Google Analytics. Ver
// lib/telemetry/consent.ts para el detalle de qué implica cada categoría.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  MEDICION_REQUIERE_CONSENTIMIENTO,
  getConsent,
  setConsent,
} from '@/lib/telemetry/consent'
import { EVENTS, trackEvent } from '@/lib/telemetry/analytics'

export const OPEN_PREFS_EVENT = 'lanedata:cookie-prefs'

/** Vuelve a abrir el panel de preferencias desde cualquier sitio. */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(OPEN_PREFS_EVENT))
}

const monoLabel = 'font-mono text-[0.6875rem] tracking-[0.22em] uppercase'

export function CookieBanner() {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(false)
  const [measurement, setMeasurement] = useState(!MEDICION_REQUIERE_CONSENTIMIENTO)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    // Sin respuesta previa (o caducada) → preguntamos.
    if (!getConsent()) setOpen(true)

    const reopen = () => {
      const current = getConsent()
      setAnalytics(current?.analytics ?? false)
      setMeasurement(current?.measurement ?? !MEDICION_REQUIERE_CONSENTIMIENTO)
      setDetail(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_PREFS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFS_EVENT, reopen)
  }, [])

  function decide(value: { analytics: boolean; measurement: boolean }, how: string) {
    setConsent(value)
    setOpen(false)
    setDetail(false)
    // Se registra la respuesta, no quién la dio: es la prueba de consentimiento
    // agregada que pide el RGPD, sin identificar a nadie.
    trackEvent(EVENTS.consent, how)
  }

  const acceptAll = () => decide({ analytics: true, measurement: true }, 'aceptar')
  const rejectAll = () =>
    decide({ analytics: false, measurement: !MEDICION_REQUIERE_CONSENTIMIENTO }, 'rechazar')
  const saveChoice = () => decide({ analytics, measurement }, 'personalizar')

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-mint/25 bg-ink text-cream shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <p id="cookie-title" className={`${monoLabel} text-mint`}>
              Cookies en lanedata
            </p>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-cream/75">
              Usamos almacenamiento técnico para que la web funcione y una medición propia
              y anónima para saber qué se lee. Solo con tu permiso activamos{' '}
              <strong className="font-semibold text-cream">Google Analytics</strong>, que
              es un tercero y trata datos fuera de la UE. Puedes rechazarlo y todo sigue
              funcionando igual.{' '}
              <Link
                href="/legal/cookies/"
                className="underline decoration-mint/50 underline-offset-4 hover:decoration-mint"
              >
                Política de cookies
              </Link>
              .
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center lg:pt-1">
            <button
              onClick={rejectAll}
              className={`${monoLabel} border border-cream/30 px-5 py-3 text-cream transition-colors hover:border-cream hover:bg-cream/10`}
            >
              Rechazar
            </button>
            <button
              onClick={acceptAll}
              className={`${monoLabel} bg-mint px-5 py-3 text-ink transition-colors hover:bg-cream`}
            >
              Aceptar
            </button>
            <button
              onClick={() => setDetail((v) => !v)}
              aria-expanded={detail}
              className={`${monoLabel} px-2 py-3 text-cream/55 underline-offset-4 transition-colors hover:text-cream hover:underline`}
            >
              Configurar
            </button>
          </div>
        </div>

        {detail && (
          <div className="mt-6 border-t border-cream/[0.15] pt-5">
            <ul className="grid gap-4 sm:grid-cols-3">
              <Category
                title="Técnicas"
                required
                checked
                description="Sesión de administración, preferencias y este mismo aviso. Sin ellas la web no funciona, por eso no se pueden desactivar."
              />
              <Category
                title="Medición propia"
                required={!MEDICION_REQUIERE_CONSENTIMIENTO}
                checked={measurement}
                onChange={setMeasurement}
                description="Estadísticas agregadas y anónimas en nuestro propio servidor: páginas vistas, país aproximado y qué calculadoras se usan. Sin cookies ni identificadores persistentes."
              />
              <Category
                title="Google Analytics"
                checked={analytics}
                onChange={setAnalytics}
                description="Analítica de Google, con cookies propias y transferencia internacional de datos. Desactivada mientras no la actives tú."
              />
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={saveChoice}
                className={`${monoLabel} bg-cream px-5 py-3 text-ink transition-colors hover:bg-mint`}
              >
                Guardar preferencias
              </button>
              <Link
                href="/legal/privacidad/"
                className={`${monoLabel} text-cream/50 underline-offset-4 hover:text-cream hover:underline`}
              >
                Política de privacidad
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Category({
  title,
  description,
  checked,
  required = false,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  required?: boolean
  onChange?: (v: boolean) => void
}) {
  const id = `cookie-cat-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <li className="border border-cream/[0.15] p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-brand text-base font-extrabold tracking-tight text-cream">
          {title}
        </label>
        {required ? (
          <span className={`${monoLabel} text-mint/70`}>Siempre</span>
        ) : (
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-mint"
          />
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-cream/55">{description}</p>
    </li>
  )
}
