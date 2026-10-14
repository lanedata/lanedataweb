// Datos de autocompletado del mercado de fichajes: clubes (con su división
// 2027) y atletas adultos con su club 2026. Los genera
// scripts/gen_fichajes_datos.py a partir de los CSV de la temporada.
//
// Se cargan bajo demanda (la primera vez que alguien busca), no al abrir la
// página: atletas.json pesa ~200 KB comprimido y el directo no lo necesita.

import {
  DIVISION_NOMBRE, normalizar,
  type CodigoDivision, type Genero,
} from './types'

export interface Club {
  /** Nombre tal cual figura en la RFEA. */
  n: string
  /** Federación autonómica (CVA, MAD…). */
  f: string
  /** División 2027 por sexo, si el club está en DH o Primera. */
  d?: Partial<Record<Genero, CodigoDivision>>
}

export interface Atleta {
  nombre: string
  club: Club | null
  genero: Genero
}

interface Indice {
  clubes: Club[]
  clubesNorm: string[]
  atletas: Atleta[]
  atletasNorm: string[]
}

const BASE = '/data/fichajes'
let promesa: Promise<Indice> | null = null

/** Descarga (una sola vez) y prepara los datos para buscar rápido. */
export function cargarDatos(): Promise<Indice> {
  if (!promesa) {
    promesa = (async () => {
      const [clubes, crudos] = await Promise.all([
        fetch(`${BASE}/clubes.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))) as Promise<Club[]>,
        fetch(`${BASE}/atletas.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))) as Promise<[string, number, 0 | 1][]>,
      ])
      const atletas: Atleta[] = crudos.map(([nombre, ci, g]) => ({
        nombre,
        club: ci >= 0 ? clubes[ci] ?? null : null,
        genero: g === 0 ? 'H' : 'M',
      }))
      return {
        clubes,
        clubesNorm: clubes.map((c) => normalizar(c.n)),
        atletas,
        atletasNorm: atletas.map((a) => normalizar(a.nombre)),
      }
    })().catch((e) => {
      promesa = null // que se pueda reintentar
      throw e
    })
  }
  return promesa
}

/**
 * Coincidencia por palabras: todas las palabras escritas tienen que estar en
 * el nombre, en cualquier orden ("garcia maria" encuentra "María García").
 * Puntúa mejor si empieza igual.
 */
function buscar<T>(items: T[], norms: string[], q: string, max: number): T[] {
  const consulta = normalizar(q)
  if (consulta.length < 2) return []
  const palabras = consulta.split(' ')
  const res: { item: T; score: number }[] = []
  for (let i = 0; i < norms.length; i++) {
    const n = norms[i]
    if (!palabras.every((p) => n.includes(p))) continue
    let score = 0
    if (n.startsWith(consulta)) score += 3
    if (n.startsWith(palabras[0])) score += 1
    if (palabras.every((p) => n.split(' ').some((w) => w.startsWith(p)))) score += 2
    res.push({ item: items[i], score })
    if (res.length > 400) break
  }
  // El orden de los ficheros ya es útil (clubes grandes primero, atletas por
  // nombre): a igualdad de puntuación se respeta.
  return res
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((r) => r.item)
}

export async function buscarAtletas(q: string, max = 8): Promise<Atleta[]> {
  const d = await cargarDatos()
  return buscar(d.atletas, d.atletasNorm, q, max)
}

export async function buscarClubes(q: string, max = 8): Promise<Club[]> {
  const d = await cargarDatos()
  return buscar(d.clubes, d.clubesNorm, q, max)
}

/** Club exacto por nombre (para resolver la división de lo que ya se escribió). */
export async function clubPorNombre(nombre: string): Promise<Club | null> {
  if (!nombre.trim()) return null
  const d = await cargarDatos()
  const n = normalizar(nombre)
  const i = d.clubesNorm.indexOf(n)
  return i >= 0 ? d.clubes[i] : null
}

/** División 2027 de un club para un sexo, con el nombre que se guarda. */
export function divisionDe(club: Club | null, genero: Genero | null): string | null {
  if (!club?.d || !genero) return null
  const cod = club.d[genero]
  return cod ? DIVISION_NOMBRE[cod] : null
}
