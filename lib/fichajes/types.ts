// Mercado de fichajes — tipos y helpers compartidos (directo, formularios,
// panel y plantillas de historias).
//
// Un fichaje puede tener una INCÓGNITA: se sabe que el atleta deja su club pero
// no a dónde va (club_destino = null), o al revés. El esquema exige conocer al
// menos uno de los dos.

export type EstadoFichaje = 'rumor' | 'confirmado'
export type Genero = 'H' | 'M'
export type OrigenEnvio = 'colaborador' | 'atleta' | 'admin' | 'chivatazo'

export interface Fichaje {
  id: string
  /** Hora a la que se informó del fichaje (ISO). Es la que ordena el directo. */
  informado_en: string
  /** Nombre y apellidos. */
  atleta: string
  estado: EstadoFichaje
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  division_origen: string | null
  division_destino: string | null
  fuente: string | null
  nota: string | null
  origen_envio: OrigenEnvio
  /** Fichaje bomba: lo marca el admin y se resalta en todas partes. */
  bomba: boolean
}

/** Columnas que pide el directo público (nada privado). */
export const FICHAJE_COLUMNS =
  'id, informado_en, atleta, estado, genero, club_origen, club_destino, division_origen, division_destino, fuente, nota, origen_envio, bomba'

/**
 * Colaborador (solo lo ve el admin). Entra en /fichajes/enviar/ iniciando
 * sesión con su correo —contraseña o Google—; `user_id` se rellena solo la
 * primera vez que entra.
 */
export interface Colaborador {
  id: string
  creado_en: string
  nombre: string
  email: string | null
  user_id: string | null
  activo: boolean
  revocado_en: string | null
  ultimo_envio_en: string | null
  ultimo_acceso_en: string | null
}

/** El único enlace de colaboradores: el mismo para todos. */
export const RUTA_COLABORADORES = '/fichajes/enviar/'

// ─── Lo que ve un colaborador (funciones colab_* del SQL) ────────────────────

/** Incidencia abierta sobre un fichaje. Anónima: solo se sabe si es mía. */
export interface Incidencia {
  id: string
  texto: string
  creado_en: string
  mia: boolean
}

/** Un fichaje del directo visto por un colaborador: sin autor, solo si es suyo. */
export interface FichajeColab extends Omit<Fichaje, 'origen_envio'> {
  origen_envio: OrigenEnvio
  visible: boolean
  mio: boolean
  incidencias: Incidencia[]
}

/** Chivatazo pendiente tal como lo ve un colaborador (sin el contacto). */
export interface ChivatazoPendiente {
  id: string
  creado_en: string
  atleta: string
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  division_origen: string | null
  division_destino: string | null
  nota: string | null
  fuente: string | null
  /** Pruebas para comprobarlo: un enlace y/o un archivo del bucket privado. */
  enlace: string | null
  adjunto: string | null
}

/** Incidencia tal como la ve el admin (con quién la marcó). */
export interface IncidenciaAdmin {
  id: string
  creado_en: string
  fichaje_id: string
  colaborador_id: string | null
  texto: string
  resuelta_en: string | null
}

/**
 * El tablón (atletas que buscan club / clubes que buscan atletas) está OCULTO
 * en la web pública. El código y los datos siguen ahí: pon `true` para que
 * vuelva a salir en /mercado, /test y la portada.
 */
export const TABLON_VISIBLE: boolean = false

// ─── Tablón ──────────────────────────────────────────────────────────────────
export type TipoAnuncio = 'atleta' | 'club'
export interface Anuncio {
  id: string
  creado_en?: string
  publicado_en: string | null
  tipo: TipoAnuncio
  estado: 'pendiente' | 'publicado' | 'cerrado'
  autor: string
  club_actual: string | null
  genero: 'H' | 'M' | 'X' | null
  pruebas: string | null
  zona: string | null
  texto: string
  busca: string | null
  ofrece: string | null
  perfil_url: string | null
  contacto?: string | null
}
export const ANUNCIO_COLUMNS_PUBLICAS =
  'id, publicado_en, tipo, estado, autor, club_actual, genero, pruebas, zona, texto, busca, ofrece, perfil_url'

export interface Interesado {
  id: string
  creado_en: string
  anuncio_id: string
  nombre: string
  mensaje: string | null
  contacto: string
  atendido: boolean
}

const MA = 'https://mundoatletismo.es'

/**
 * Ficha de un atleta en mundoatletismo.es en modo incrustable y con la skin
 * «lane». La web enruta por ruta (/atleta/<nombre>) y tiene un modo embed
 * (/embed/...); el club ayuda a desambiguar homónimos. Se genera sola a partir
 * del nombre de la RFEA, que es el mismo que usa Mundo Atletismo.
 */
export function perfilMA(nombre: string, club?: string | null): string | null {
  const n = nombre.trim()
  if (n.length < 3) return null
  const q = new URLSearchParams({ skin: 'lane' })
  if (club) q.set('club', club)
  // Mundo Atletismo guarda los nombres en mayúsculas, como la RFEA.
  return `${MA}/embed/atleta/${encodeURIComponent(n.toLocaleUpperCase('es'))}?${q.toString()}`
}

/**
 * Normaliza cualquier enlace de mundoatletismo.es a su versión embed con skin
 * «lane» (acepta rutas antiguas con #/). null si no es de mundoatletismo.es.
 */
export function perfilLane(url: string | null | undefined): string | null {
  if (!url) return null
  let u: URL
  try { u = new URL(url.trim()) } catch { return null }
  if (u.protocol !== 'https:' || !/^(www\.)?mundoatletismo\.es$/.test(u.hostname)) return null
  let ruta = u.pathname
  let q = u.search
  if (u.hash.startsWith('#/')) {
    const [r, h = ''] = u.hash.slice(1).split('?')
    ruta = r
    q = h ? `?${h}` : q
  }
  if (!ruta.startsWith('/embed')) ruta = `/embed${ruta === '/' ? '' : ruta}`
  const p = new URLSearchParams(q)
  p.set('skin', 'lane')
  return `${MA}${ruta}?${p.toString()}`
}

/**
 * Marca de respaldo en la nota de un chivatazo cuando la base de datos aún no
 * tiene la columna `tipo` (SQL v4 sin aplicar): así el admin lo distingue.
 */
export const MARCA_CHIVATAZO = '[Chivatazo]'

/** ¿Esta propuesta es un chivatazo (de un tercero) y no del propio atleta? */
export function esChivatazo(p: Pick<Propuesta, 'tipo' | 'nota'>): boolean {
  return p.tipo === 'chivatazo' || (p.nota ?? '').startsWith(MARCA_CHIVATAZO)
}

/** Propuesta pendiente de aprobar: del propio atleta o un chivatazo (solo la ve el admin). */
export interface Propuesta {
  id: string
  creado_en: string
  atleta: string
  genero: Genero | null
  club_origen: string | null
  club_destino: string | null
  division_origen: string | null
  division_destino: string | null
  nota: string | null
  contacto: string | null
  /** Faltan si el SQL v4 no está aplicado. */
  tipo?: 'atleta' | 'chivatazo'
  fuente?: string | null
  /** Pruebas (SQL v6): un enlace y/o el nombre de un archivo del bucket privado. */
  enlace?: string | null
  adjunto?: string | null
  /** Un colaborador lo descartó: sigue aquí por si el admin quiere repescarlo. */
  descartada_en?: string | null
  descartada_por?: string | null
}

// ─── Divisiones ──────────────────────────────────────────────────────────────

/** Código corto de clubes.json → nombre que se guarda y se muestra. */
export const DIVISION_NOMBRE = {
  DH: 'División de Honor',
  '1D': 'Primera División',
} as const
export type CodigoDivision = keyof typeof DIVISION_NOMBRE

/** Sugerencias del campo división; acepta cualquier texto. */
export const DIVISIONES = [
  DIVISION_NOMBRE.DH,
  DIVISION_NOMBRE['1D'],
  'Segunda División',
  'Sin división',
]

/** "División de Honor" → "DH", "Primera División" → "1ª". Para chips. */
export function divisionCorta(division: string | null): string | null {
  if (!division) return null
  const d = division.toLowerCase()
  if (d.includes('honor')) return 'DH'
  if (d.includes('primera')) return '1ª'
  if (d.includes('segunda')) return '2ª'
  if (d.startsWith('sin')) return null
  return division.length <= 6 ? division : null
}

export const ESTADO_ETIQUETA: Record<EstadoFichaje, string> = {
  rumor: 'Rumor',
  confirmado: 'Confirmado',
}

// ─── Clasificación y tiempos ─────────────────────────────────────────────────

export type TipoFichaje = 'completo' | 'destino-incognito' | 'origen-incognito'

export function tipoDe(f: Pick<Fichaje, 'club_origen' | 'club_destino'>): TipoFichaje {
  if (!f.club_destino) return 'destino-incognito'
  if (!f.club_origen) return 'origen-incognito'
  return 'completo'
}

/** "14:32" en hora local. */
export function horaDe(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/** "hoy" | "ayer" | "12 sep" — para agrupar el directo por días. */
export function diaDe(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hoy = new Date()
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (mismoDia(d, hoy)) return 'hoy'
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (mismoDia(d, ayer)) return 'ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** "ahora mismo" | "hace 7 min" | "hace 3 h" | "hace 2 días". */
export function haceDe(iso: string, ahora: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const seg = Math.max(0, Math.round((ahora - t) / 1000))
  if (seg < 45) return 'ahora mismo'
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'hace 1 día' : `hace ${d} días`
}

// ─── Nombres ─────────────────────────────────────────────────────────────────

/** Minúsculas y sin tildes, para buscar sin que importe cómo se escriba. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

/**
 * Reparte un nombre completo en nombre de pila y apellidos para las historias,
 * donde van en dos tamaños. Heurística: con 4+ palabras el nombre de pila son
 * las dos primeras (María José, Juan Carlos); si no, la primera. En la tarjeta
 * el texto es editable, así que si falla se corrige a mano.
 */
export function partirNombre(completo: string): { nombre: string; apellidos: string } {
  const p = completo.trim().split(/\s+/)
  if (p.length <= 1) return { nombre: '', apellidos: p[0] ?? '' }
  const corte = p.length >= 4 ? 2 : 1
  return { nombre: p.slice(0, corte).join(' '), apellidos: p.slice(corte).join(' ') }
}
