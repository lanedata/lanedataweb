// Contexto común a errores y analíticas: quién es esta pestaña y con qué
// navega. Todo se calcula una sola vez y se cachea, porque no cambia.
//
// Nada de lo que hay aquí identifica a una persona: no se lee ni se escribe
// ninguna cookie, no hay huella digital del navegador y el identificador de
// sesión es un aleatorio que vive en sessionStorage (muere al cerrar pestaña).

import { detectCountry, detectTimezone } from './geo'

export const SESSION_KEY = 'ld_sid'

/** Versión de la app que va en cada error: el commit corto si el build lo trae. */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) || 'dev'

export interface ClientContext {
  sessionId: string
  device: 'movil' | 'tablet' | 'escritorio'
  os: string
  browser: string
  screen: string
  viewport: string
  language: string
  timezone: string
  country: string
}

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

/** Id de sesión: uno por pestaña, se olvida al cerrarla. */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = randomId()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    // Navegación privada con almacenamiento bloqueado: id efímero en memoria.
    return (memorySessionId ||= randomId())
  }
}

let memorySessionId = ''

function detectDevice(ua: string): ClientContext['device'] {
  if (/\b(ipad|tablet|playbook|silk)\b/i.test(ua)) return 'tablet'
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet'
  if (/(android|iphone|ipod|mobile|blackberry|iemobile|opera mini)/i.test(ua)) return 'movil'
  return 'escritorio'
}

function detectOs(ua: string): string {
  if (/windows nt 10/i.test(ua)) return 'Windows'
  if (/windows/i.test(ua)) return 'Windows'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/mac os x/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/cros/i.test(ua)) return 'ChromeOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Otro'
}

function detectBrowser(ua: string): string {
  // El orden importa: casi todos mienten diciendo también "Safari"/"Chrome".
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Otro'
}

let cached: ClientContext | null = null

export function getClientContext(): ClientContext {
  if (cached) return { ...cached, viewport: currentViewport() }
  if (typeof window === 'undefined') {
    return {
      sessionId: '', device: 'escritorio', os: '', browser: '', screen: '',
      viewport: '', language: '', timezone: '', country: '',
    }
  }

  const ua = navigator.userAgent || ''
  const timezone = detectTimezone()

  cached = {
    sessionId: getSessionId(),
    device: detectDevice(ua),
    os: detectOs(ua),
    browser: detectBrowser(ua),
    screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    viewport: currentViewport(),
    language: (navigator.language || '').slice(0, 12),
    timezone,
    country: detectCountry(timezone),
  }
  return cached
}

function currentViewport(): string {
  if (typeof window === 'undefined') return ''
  return `${window.innerWidth}x${window.innerHeight}`
}

/**
 * Zona funcional a partir de la ruta: "/articulo/katir-5000/" → "articulo",
 * "/admin/dato/" → "admin/dato", "/" → "portada". Se usa para agrupar errores.
 */
export function areaFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (!parts.length) return 'portada'
  if (parts[0] === 'admin') return parts.slice(0, 2).join('/')
  return parts[0]
}

/** Host del referrer, vacío si es tráfico directo o viene de la propia web. */
export function referrerHost(): string {
  if (typeof document === 'undefined' || !document.referrer) return ''
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, '')
    return host === window.location.hostname.replace(/^www\./, '') ? '' : host
  } catch {
    return ''
  }
}
