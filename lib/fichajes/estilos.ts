// Colores y escudos de los clubes (tabla `clubes_estilo`, editable en
// /admin/fichajes). Se cargan una vez por página y se buscan por nombre
// normalizado, así «C.A. Fent Camí» y «c.a. fent cami» son el mismo club.

import { createClient } from '@/lib/supabase/client'
import { normalizar } from './types'

export interface EstiloClub {
  nombre: string
  color: string | null
  color2: string | null
  logo_url: string | null
  /** true = no quitar el fondo del escudo (se marca en el admin). */
  logo_fondo?: boolean
}

let promesa: Promise<Map<string, EstiloClub>> | null = null

export function cargarEstilos(forzar = false): Promise<Map<string, EstiloClub>> {
  if (!promesa || forzar) {
    promesa = (async () => {
      const sb = createClient()
      let { data, error } = await sb.from('clubes_estilo').select('nombre, color, color2, logo_url, logo_fondo')
      if (error) ({ data, error } = await sb.from('clubes_estilo').select('nombre, color, color2, logo_url'))
      if (error || !data) return new Map()
      return new Map((data as EstiloClub[]).map((e) => [normalizar(e.nombre), e]))
    })()
  }
  return promesa
}

export function estiloDe(mapa: Map<string, EstiloClub> | null, club: string | null): EstiloClub | null {
  if (!mapa || !club) return null
  return mapa.get(normalizar(club)) ?? null
}

/** Texto legible (claro u oscuro) sobre un color de fondo. */
export function tintaSobre(hex: string | null | undefined, oscura = '#0c2a18', clara = '#ffffff'): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return oscura
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? oscura : clara
}

// ─── Ajustes de la web ───────────────────────────────────────────────────────

export type PosicionMercado = 'oculto' | 'arriba' | 'tras-analisis' | 'abajo'

export const POSICION_NOMBRE: Record<PosicionMercado, string> = {
  oculto: 'No sale en la portada',
  arriba: 'Arriba del todo',
  'tras-analisis': 'Tras el último análisis',
  abajo: 'Al final de la portada',
}

/** Bloques del mercado que se activan por separado en la portada. */
export type BloqueMercado = 'fichajes' | 'tablon'
export const BLOQUE_NOMBRE: Record<BloqueMercado, string> = {
  fichajes: 'Últimos fichajes',
  tablon: 'Tablón (atletas y clubes)',
}
const CLAVE: Record<BloqueMercado, string> = { fichajes: 'mercado_portada', tablon: 'tablon_portada' }

const posPromesa: Partial<Record<BloqueMercado, Promise<PosicionMercado>>> = {}

export function posicionMercado(bloque: BloqueMercado = 'fichajes'): Promise<PosicionMercado> {
  posPromesa[bloque] ??= (async () => {
    const { data } = await createClient()
      .from('web_ajustes').select('valor').eq('clave', CLAVE[bloque]).maybeSingle()
    const p = (data?.valor as { posicion?: string } | null)?.posicion
    return (p && p in POSICION_NOMBRE ? p : 'oculto') as PosicionMercado
  })().catch(() => 'oculto' as PosicionMercado)
  return posPromesa[bloque]!
}

export async function guardarPosicionMercado(p: PosicionMercado, bloque: BloqueMercado = 'fichajes') {
  delete posPromesa[bloque]
  return createClient().from('web_ajustes')
    .upsert({ clave: CLAVE[bloque], valor: { posicion: p }, actualizado_en: new Date().toISOString() })
}
