// Compensación por cambio de club que publica la RFEA (circular de atletas con
// compensación). La genera scripts/gen_fichajes_compensaciones.py a partir del
// PDF. Se descarga una sola vez y solo cuando hay algún nombre que mirar.

import { normalizar } from './types'

export interface Compensacion {
  nombre: string
  club: string
  temporada: string
  tipo: string
  euros: number
  circular: string
}

interface Archivo { circular: string; a: Record<string, [string, string, string, string, number]> }

let promesa: Promise<Archivo | null> | null = null

function cargar(): Promise<Archivo | null> {
  promesa ??= fetch('/data/fichajes/compensaciones.json')
    .then((r) => (r.ok ? (r.json() as Promise<Archivo>) : null))
    .catch(() => null)
  return promesa
}

const clave = (nombre: string) => normalizar(nombre).split(' ').sort().join(' ')

/** Compensación del atleta, o null si no figura en la circular. */
export async function compensacionDe(nombre: string): Promise<Compensacion | null> {
  const d = await cargar()
  if (!d) return null
  let f = d.a[clave(nombre)]
  if (!f) {
    // «Iker Arotzena» sin segundo apellido: vale si todas sus palabras están
    // en un único atleta de la lista (y son al menos dos).
    const palabras = normalizar(nombre).split(' ').filter(Boolean)
    if (palabras.length < 2) return null
    const hits = Object.entries(d.a).filter(([k]) => {
      const ks = k.split(' ')
      return palabras.every((p) => ks.includes(p))
    })
    if (hits.length !== 1) return null
    f = hits[0][1]
  }
  return { nombre: f[0], club: f[1], temporada: f[2], tipo: f[3], euros: f[4], circular: d.circular }
}

/** 1750 → «1.750 €» (es-ES no agrupa los miles con cuatro cifras). */
export function euros(n: number): string {
  const [ent, dec] = n.toFixed(2).split('.')
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec === '00' ? '' : `,${dec}`) + ' €'
}
