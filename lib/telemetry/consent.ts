// Consentimiento de cookies (art. 22.2 LSSI-CE + RGPD).
//
// Tres estados y una regla clara:
//
//   · Técnicas          → siempre. No se piden porque sin ellas la web no va.
//   · Medición propia   → analítica de primera parte, anónima y agregada, que
//                         no sale de nuestro Supabase. Se acoge a la excepción
//                         de medición de audiencia de la Guía de cookies de la
//                         AEPD, así que va sin consentimiento previo. Si
//                         prefieres la lectura estricta, pon
//                         MEDICION_REQUIERE_CONSENTIMIENTO = true y pasará a
//                         pedirse como cualquier otra.
//   · Analítica externa → Google Analytics. Es un tercero y transfiere datos
//                         fuera de la UE: NO se carga hasta que la persona dice
//                         que sí, y se apaga si lo retira.
//
// La decisión se guarda en localStorage, no en una cookie: menos superficie y
// mismo efecto. Caduca a los 24 meses, que es lo que recomienda la AEPD.

export const CONSENT_KEY = 'lanedata_consent_v1'
export const CONSENT_EVENT = 'lanedata:consent'

/**
 * Ponlo a true para pedir consentimiento también para la medición propia.
 *
 * Ojo: mientras no exista el banner de cookies (llega con los textos legales)
 * nadie puede responder, así que ponerlo a true aquí apagaría la medición del
 * todo en vez de condicionarla.
 */
export const MEDICION_REQUIERE_CONSENTIMIENTO = false

/** Meses que vale una respuesta antes de volver a preguntar. */
const CADUCIDAD_MESES = 24

export interface Consent {
  /** Google Analytics y cualquier otro tercero de medición. */
  analytics: boolean
  /** Medición propia (Supabase). */
  measurement: boolean
  /** Fecha ISO en la que se respondió. */
  decidedAt: string
}

export const CONSENT_DENIED: Consent = {
  analytics: false,
  measurement: MEDICION_REQUIERE_CONSENTIMIENTO ? false : true,
  decidedAt: '',
}

export const CONSENT_GRANTED: Consent = {
  analytics: true,
  measurement: true,
  decidedAt: '',
}

function expired(decidedAt: string): boolean {
  if (!decidedAt) return true
  const then = new Date(decidedAt).getTime()
  if (Number.isNaN(then)) return true
  return Date.now() - then > CADUCIDAD_MESES * 30 * 24 * 60 * 60 * 1000
}

/** Lo que la persona decidió, o null si todavía no ha decidido (o ya caducó). */
export function getConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Consent>
    if (typeof parsed?.analytics !== 'boolean') return null
    if (expired(parsed.decidedAt ?? '')) return null
    return {
      analytics: parsed.analytics,
      measurement: parsed.measurement ?? CONSENT_DENIED.measurement,
      decidedAt: parsed.decidedAt ?? '',
    }
  } catch {
    return null
  }
}

/** Consentimiento efectivo ahora mismo: si no ha respondido, todo denegado. */
export function effectiveConsent(): Consent {
  return getConsent() ?? CONSENT_DENIED
}

export function setConsent(value: Omit<Consent, 'decidedAt'>): Consent {
  const full: Consent = { ...value, decidedAt: new Date().toISOString() }
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(full))
  } catch {
    // Almacenamiento bloqueado: la decisión vale para esta sesión y ya.
  }
  try {
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: full }))
  } catch {
    /* navegadores muy antiguos */
  }
  return full
}

/** Borra la decisión para que el banner vuelva a salir. */
export function resetConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* nada que hacer */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))
  } catch {
    /* nada que hacer */
  }
}

/** Se avisa cuando cambia la decisión, en esta pestaña o en otra. */
export function onConsentChange(cb: (consent: Consent | null) => void): () => void {
  const local = () => cb(getConsent())
  const storage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) cb(getConsent())
  }
  window.addEventListener(CONSENT_EVENT, local as EventListener)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(CONSENT_EVENT, local as EventListener)
    window.removeEventListener('storage', storage)
  }
}

/** ¿Puede correr la medición propia? */
export function canMeasure(): boolean {
  if (!MEDICION_REQUIERE_CONSENTIMIENTO) return true
  return effectiveConsent().measurement
}
