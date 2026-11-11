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
}

let promesa: Promise<Map<string, EstiloClub>> | null = null

export function cargarEstilos(forzar = false): Promise<Map<string, EstiloClub>> {
  if (!promesa || forzar) {
    promesa = (async () => {
      const { data, error } = await createClient()
        .from('clubes_estilo').select('nombre, color, color2, logo_url')
      if (error) return new Map()
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

let posPromesa: Promise<PosicionMercado> | null = null

export function posicionMercado(): Promise<PosicionMercado> {
  if (!posPromesa) {
    posPromesa = (async () => {
      const { data } = await createClient()
        .from('web_ajustes').select('valor').eq('clave', 'mercado_portada').maybeSingle()
      const p = (data?.valor as { posicion?: string } | null)?.posicion
      return (p && p in POSICION_NOMBRE ? p : 'oculto') as PosicionMercado
    })().catch(() => 'oculto' as PosicionMercado)
  }
  return posPromesa
}

export async function guardarPosicionMercado(p: PosicionMercado) {
  posPromesa = null
  return createClient().from('web_ajustes')
    .upsert({ clave: 'mercado_portada', valor: { posicion: p }, actualizado_en: new Date().toISOString() })
}
