// Formas de fila que devuelve Supabase para las tablas y funciones de
// telemetría. Coinciden con supabase/telemetry-schema.sql.

export interface ErrorLog {
  id: string
  created_at: string
  fingerprint: string
  severity: 'error' | 'aviso' | 'info'
  source: 'js' | 'promesa' | 'react' | 'recurso' | 'supabase' | 'manual'
  message: string
  stack: string | null
  area: string | null
  user_action: string | null
  path: string | null
  referrer: string | null
  browser: string | null
  os: string | null
  device: string | null
  viewport: string | null
  language: string | null
  session_id: string | null
  app_version: string | null
  context: Record<string, unknown> | null
  status: ErrorStatus
  notes: string | null
}

export type ErrorStatus = 'nuevo' | 'revisando' | 'resuelto' | 'ignorado'

/** Un grupo de errores con la misma huella: el mismo fallo repetido. */
export interface ErrorGroup {
  fingerprint: string
  latest: ErrorLog
  count: number
  sessions: number
  firstSeen: string
  lastSeen: string
  rows: ErrorLog[]
}

export interface AnalyticsOverview {
  views: number
  sessions: number
  countries: number
  avg_seconds: number | null
  bounce_rate: number | null
  feature_events: number
}

export interface DayRow {
  day: string
  views: number
  sessions: number
}

export interface HourRow {
  hour: number
  views: number
}

export interface DimensionRow {
  label: string
  views: number
  sessions: number
}

export interface PageRow {
  path: string
  views: number
  sessions: number
  avg_seconds: number | null
}

export interface FeatureRow {
  name: string
  label: string
  uses: number
  sessions: number
}

/** Etiquetas legibles de los nombres de evento en el panel. */
export const FEATURE_LABELS: Record<string, string> = {
  lab_tool: 'LaneLab · herramienta abierta',
  lab_calculo: 'LaneLab · cálculo ejecutado',
  buscar: 'Búsqueda',
  compartir: 'Compartir artículo',
  articulo_abierto: 'Artículo abierto',
  articulo_leido: 'Artículo leído hasta el final',
  archivo_filtro: 'Archivo · filtro de categoría',
  enlace_externo: 'Enlace externo',
  cookies: 'Respuesta al aviso de cookies',
}

export const SOURCE_LABELS: Record<string, string> = {
  js: 'Excepción JS',
  promesa: 'Promesa sin capturar',
  react: 'Render de React',
  recurso: 'Recurso que no carga',
  supabase: 'Supabase',
  manual: 'Registrado a mano',
}

export const STATUS_LABELS: Record<ErrorStatus, string> = {
  nuevo: 'Nuevo',
  revisando: 'Revisando',
  resuelto: 'Resuelto',
  ignorado: 'Ignorado',
}
