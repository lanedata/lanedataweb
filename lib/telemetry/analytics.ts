// Analítica propia, sin cookies y sin terceros.
//
// Cada evento es una fila en `analytics_events` de Supabase. Se manda con
// fetch(keepalive) contra la API REST en vez de con supabase-js porque el
// evento de cierre de sesión sale mientras la pestaña se está muriendo, y
// keepalive es lo único que garantiza que salga.
//
// Qué se guarda: ruta, título, de dónde venía, país deducido de la zona
// horaria, dispositivo, navegador y cuánto ha durado la visita.
// Qué NO se guarda: IP, cookies, identificador persistente, nada de la persona.

import { canMeasure } from './consent'
import { getClientContext, referrerHost } from './context'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const ENDPOINT = `${SUPABASE_URL}/rest/v1/analytics_events`

/** Nombres de evento. Tenerlos aquí evita que el panel se llene de sinónimos. */
export const EVENTS = {
  pageView: 'page_view',
  /** Tiempo pasado en una página, al salir de ella. No cuenta como visita. */
  pageTime: 'page_time',
  sessionEnd: 'session_end',
  /** Se abre una calculadora de LaneLab. label = id de la herramienta. */
  labTool: 'lab_tool',
  /** Se ejecuta un cálculo. label = id de la herramienta. */
  labCalc: 'lab_calculo',
  /** Búsqueda en el archivo o en el buscador. label = término. */
  search: 'buscar',
  /** Se comparte un artículo. label = método (nativo, copiar…). */
  share: 'compartir',
  /** Se abre un artículo desde una tarjeta. label = slug. */
  articleOpen: 'articulo_abierto',
  /** Se llega al final de un artículo. label = slug. */
  articleRead: 'articulo_leido',
  /** Filtro del archivo. label = categoría. */
  archiveFilter: 'archivo_filtro',
  /** Clic en un enlace externo. label = host. */
  outbound: 'enlace_externo',
  /** Respuesta al banner de cookies. label = aceptar | rechazar | personalizar. */
  consent: 'cookies',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

interface EventRow {
  session_id: string
  name: string
  path?: string | null
  title?: string | null
  referrer_host?: string | null
  country?: string | null
  timezone?: string | null
  language?: string | null
  device?: string | null
  os?: string | null
  browser?: string | null
  screen?: string | null
  label?: string | null
  duration_ms?: number | null
  props?: Record<string, unknown> | null
}

const enabled = () =>
  typeof window !== 'undefined' &&
  Boolean(SUPABASE_URL && SUPABASE_KEY) &&
  process.env.NODE_ENV === 'production' &&
  canMeasure()

function send(row: EventRow, keepalive = false): void {
  if (!enabled()) return
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      keepalive,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => undefined)
  } catch {
    // La analítica jamás puede tumbar la web.
  }
}

function baseRow(name: string): EventRow {
  const ctx = getClientContext()
  return {
    session_id: ctx.sessionId,
    name,
    country: ctx.country || null,
    timezone: ctx.timezone || null,
    language: ctx.language || null,
    device: ctx.device,
    os: ctx.os,
    browser: ctx.browser,
    screen: ctx.screen,
  }
}

// ── Medición del tiempo ──────────────────────────────────────────────────────
// Contamos solo el tiempo con la pestaña visible: si alguien deja la web
// abierta en segundo plano toda la tarde, eso no es "tiempo de lectura".

let pageStartedAt = 0
let visibleSince = 0
let pageEngagedMs = 0
let sessionEngagedMs = 0
let currentPath = ''
let sessionClosed = false

function accumulate(): void {
  if (visibleSince) {
    const delta = Date.now() - visibleSince
    pageEngagedMs += delta
    sessionEngagedMs += delta
    visibleSince = 0
  }
}

function resume(): void {
  if (!visibleSince) visibleSince = Date.now()
}

/** Milisegundos de lectura de la página actual, cerrando el tramo abierto. */
function flushPageDuration(): number {
  accumulate()
  const ms = pageEngagedMs
  pageEngagedMs = 0
  resume()
  return ms
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Registra una vista de página. Si venimos de otra, adjunta cuánto tiempo se
 * pasó en ella (así el tiempo por página sale sin un evento extra).
 */
export function trackPageview(path: string, title?: string): void {
  if (typeof window === 'undefined') return

  const previousMs = currentPath ? flushPageDuration() : 0

  // Va como `page_time`, no como otra vista: si no, cada página contaría doble.
  if (currentPath && previousMs > 0) {
    send({ ...baseRow(EVENTS.pageTime), path: currentPath, duration_ms: clampMs(previousMs) })
  }

  currentPath = path
  pageStartedAt = Date.now()
  pageEngagedMs = 0
  resume()

  send({
    ...baseRow(EVENTS.pageView),
    path,
    title: (title ?? document.title).slice(0, 300),
    referrer_host: referrerHost() || null,
  })
}

/** Registra el uso de una funcionalidad. */
export function trackEvent(
  name: EventName | string,
  label?: string,
  props?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  send({
    ...baseRow(name),
    path: window.location.pathname,
    label: label?.slice(0, 200) ?? null,
    props: props ?? null,
  })
}

/** Cierra la sesión con su duración total. Idempotente. */
export function endSession(): void {
  if (sessionClosed || !currentPath) return
  sessionClosed = true
  accumulate()

  // El tiempo de la última página se pierde si no lo mandamos aquí.
  if (pageEngagedMs > 0) {
    send({ ...baseRow(EVENTS.pageTime), path: currentPath, duration_ms: clampMs(pageEngagedMs) }, true)
    pageEngagedMs = 0
  }

  send(
    {
      ...baseRow(EVENTS.sessionEnd),
      path: currentPath,
      duration_ms: clampMs(sessionEngagedMs),
    },
    true
  )
}

function clampMs(ms: number): number {
  // La columna acepta como mucho un día; por debajo de un segundo es ruido.
  return Math.max(0, Math.min(Math.round(ms), 86_400_000))
}

/**
 * Engancha los oyentes de visibilidad y cierre. Lo llama <Analytics/> una vez.
 */
export function installAnalytics(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      accumulate()
      // En móvil, "oculta" suele ser el último aviso antes de que la maten.
      endSession()
    } else {
      // Vuelve a estar delante: si ya habíamos cerrado, esto es una sesión viva
      // otra vez, así que reabrimos el contador.
      sessionClosed = false
      resume()
    }
  }

  const onPageHide = () => {
    accumulate()
    endSession()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)

  resume()

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
  }
}

/** Solo para depurar desde la consola. */
export function analyticsDebug() {
  return { currentPath, pageStartedAt, pageEngagedMs, sessionEngagedMs, sessionClosed, enabled: enabled() }
}
