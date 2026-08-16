// Registro de errores del cliente.
//
// Todo lo que peta en el navegador acaba en la tabla `error_logs` de Supabase,
// y desde /admin/errores se exporta a CSV para poder pasárselo a alguien que lo
// arregle. No hace falta consentimiento de cookies: es funcionamiento interno
// del sitio (interés legítimo), no seguimiento, y no guarda datos personales.
//
// Reglas de oro de este fichero:
//   1. Registrar un error NUNCA puede provocar otro error. Todo va en try/catch
//      y falla en silencio.
//   2. Nada de bucles: si un fallo se repite, se manda una vez por sesión.
//   3. Tope duro por sesión, para que una página rota no inunde la tabla.

import { createClient } from '@/lib/supabase/client'
import { APP_VERSION, areaFromPath, getClientContext } from './context'

export type ErrorSeverity = 'error' | 'aviso' | 'info'
export type ErrorSource = 'js' | 'promesa' | 'react' | 'recurso' | 'supabase' | 'manual'

export interface LogErrorInput {
  /** El error tal cual, o un mensaje si no hay objeto Error. */
  error: unknown
  /** Qué estaba haciendo el usuario: "exportando la story", "calculando puntos"… */
  action?: string
  source?: ErrorSource
  severity?: ErrorSeverity
  /** Datos sueltos que ayuden a reproducirlo. Se guardan como JSON. */
  context?: Record<string, unknown>
}

/** Máximo de errores distintos que una sesión puede mandar. */
const MAX_PER_SESSION = 25

/**
 * Ruido conocido que no es culpa nuestra y no arregla nadie: extensiones del
 * navegador, bots, avisos benignos del layout y cortes de red del visitante.
 */
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,                       // error de otro origen, sin detalle
  /extension:\/\//i,
  /chrome-extension|moz-extension|safari-web-extension/i,
  /Non-Error promise rejection captured with value: undefined/i,
  /^Load failed$/i,                            // Safari al cancelar una petición
  /NetworkError when attempting to fetch/i,
  /Failed to fetch dynamically imported module/i, // pestaña vieja tras un deploy
  /The operation was aborted/i,
  /play\(\) request was interrupted/i,
]

const sentFingerprints = new Set<string>()
let sentCount = 0
let installed = false

/** Hash corto y estable (djb2) para agrupar el mismo error entre visitas. */
function fingerprint(parts: string[]): string {
  const input = parts.join('|')
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Quita del mensaje lo que cambia en cada ocurrencia (números, uuids, urls)
 * para que dos veces el mismo fallo compartan huella.
 */
function normalizeMessage(msg: string): string {
  return msg
    .replace(/https?:\/\/[^\s)'"]+/g, '<url>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
    .replace(/\b\d{3,}\b/g, '<n>')
    .slice(0, 300)
}

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: error.message || error.name || 'Error sin mensaje', stack: error.stack ?? null }
  }
  if (typeof error === 'string') return { message: error, stack: null }
  if (error && typeof error === 'object') {
    // Los errores de supabase-js son objetos planos con message/code/details.
    const o = error as Record<string, unknown>
    const message = [o.message, o.error_description, o.error, o.details]
      .find((v) => typeof v === 'string' && v) as string | undefined
    if (message) return { message, stack: typeof o.stack === 'string' ? o.stack : null }
    try {
      return { message: JSON.stringify(error).slice(0, 500), stack: null }
    } catch {
      return { message: 'Error no serializable', stack: null }
    }
  }
  return { message: String(error), stack: null }
}

/**
 * Mensaje legible de cualquier cosa que llegue por un catch. Los errores de
 * supabase-js son objetos planos, no instancias de Error: sin esto acaban
 * pintados como «[object Object]» en la interfaz.
 */
export function errorMessage(error: unknown): string {
  return describe(error).message
}

function truncate(s: string | null, n: number): string | null {
  if (!s) return null
  return s.length > n ? s.slice(0, n) : s
}

/**
 * Registra un error. Se puede llamar desde cualquier sitio y nunca lanza:
 *
 *   try { … } catch (e) { logError({ error: e, action: 'exportar story' }) }
 */
export function logError(input: LogErrorInput): void {
  try {
    if (typeof window === 'undefined') return

    const { message, stack } = describe(input.error)
    if (!message) return
    if (IGNORED.some((re) => re.test(message))) return

    const path = window.location.pathname
    const source = input.source ?? 'manual'
    const fp = fingerprint([normalizeMessage(message), source, areaFromPath(path)])

    if (sentFingerprints.has(fp)) return
    if (sentCount >= MAX_PER_SESSION) return
    sentFingerprints.add(fp)
    sentCount++

    const ctx = getClientContext()

    // En desarrollo el error ya sale por consola con más detalle: no ensuciamos
    // la tabla con fallos que solo existen en local.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[lanedata] error registrado (solo local, no se envía):', message)
      return
    }

    void createClient()
      .from('error_logs')
      .insert({
        fingerprint: fp,
        severity: input.severity ?? 'error',
        source,
        message: message.slice(0, 2000),
        stack: truncate(stack, 8000),
        area: areaFromPath(path),
        user_action: input.action?.slice(0, 300) ?? null,
        path: path.slice(0, 500),
        referrer: (document.referrer || '').slice(0, 500),
        browser: ctx.browser,
        os: ctx.os,
        device: ctx.device,
        viewport: ctx.viewport,
        language: ctx.language,
        session_id: ctx.sessionId,
        app_version: APP_VERSION,
        context: input.context ? safeJson(input.context) : null,
      })
      .then(() => undefined, () => undefined)   // si falla el envío, se calla
  } catch {
    // Bajo ningún concepto el registrador rompe la página.
  }
}

function safeJson(value: Record<string, unknown>): Record<string, unknown> | null {
  try {
    return JSON.parse(JSON.stringify(value).slice(0, 4000)) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Engancha los tres cazadores globales. Se llama una vez, desde <ErrorTracker/>.
 * Devuelve la función para desengancharlos.
 */
export function installErrorTracking(): () => void {
  if (typeof window === 'undefined' || installed) return () => {}
  installed = true

  const onError = (event: ErrorEvent) => {
    logError({
      error: event.error ?? event.message,
      source: 'js',
      context: { file: event.filename, line: event.lineno, col: event.colno },
    })
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    logError({ error: event.reason, source: 'promesa' })
  }

  // Imágenes, scripts o CSS que no cargan. No burbujean, hay que capturarlos.
  const onResourceError = (event: Event) => {
    const el = event.target as HTMLElement | null
    if (!el || el === (window as unknown as HTMLElement)) return
    const tag = el.tagName?.toLowerCase()
    if (!tag || !['img', 'script', 'link', 'source', 'video'].includes(tag)) return
    const url = (el as HTMLImageElement).src || (el as HTMLLinkElement).href || ''
    if (!url) return
    logError({
      error: `No carga <${tag}>: ${url}`,
      source: 'recurso',
      severity: 'aviso',
      context: { tag, url },
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('error', onResourceError, true)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('error', onResourceError, true)
    installed = false
  }
}
