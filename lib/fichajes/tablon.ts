// Listas cerradas del tablón (pruebas y zonas), para que los anuncios se
// puedan filtrar: un club que busca «Lanzamientos» aparece al filtrar por
// «Peso», y un atleta de peso aparece al filtrar por «Lanzamientos».

import { normalizar } from './types'

export const GRUPOS_PRUEBAS: { grupo: string; pruebas: string[] }[] = [
  { grupo: 'Velocidad', pruebas: ['60 m', '100 m', '200 m', '400 m'] },
  { grupo: 'Vallas', pruebas: ['60 m vallas', '100 m vallas', '110 m vallas', '400 m vallas'] },
  { grupo: 'Medio fondo', pruebas: ['800 m', '1.500 m', '3.000 m obstáculos'] },
  { grupo: 'Fondo', pruebas: ['3.000 m', '5.000 m', '10.000 m', 'Ruta', 'Cross'] },
  { grupo: 'Saltos', pruebas: ['Altura', 'Pértiga', 'Longitud', 'Triple salto'] },
  { grupo: 'Lanzamientos', pruebas: ['Peso', 'Disco', 'Martillo', 'Jabalina'] },
  { grupo: 'Marcha', pruebas: ['Marcha'] },
  { grupo: 'Combinadas', pruebas: ['Combinadas'] },
]

/** Prueba o grupo → su grupo. */
const GRUPO_DE = new Map<string, string>()
for (const g of GRUPOS_PRUEBAS) {
  GRUPO_DE.set(g.grupo, g.grupo)
  for (const p of g.pruebas) GRUPO_DE.set(p, g.grupo)
}

export const ZONAS = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria', 'Castilla-La Mancha',
  'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
  'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarra', 'País Vasco', 'Cualquier zona',
]

export const separarPruebas = (s: string | null | undefined): string[] =>
  (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)

/** ¿Encaja el anuncio con la prueba (o grupo) elegida en el filtro? */
export function encajaPrueba(pruebasAnuncio: string | null, filtro: string): boolean {
  const lista = separarPruebas(pruebasAnuncio)
  const grupoFiltro = GRUPO_DE.get(filtro)
  return lista.some((p) => {
    if (p === filtro) return true
    const g = GRUPO_DE.get(p)
    // filtro = grupo y el anuncio tiene una prueba de ese grupo, o
    // el anuncio pide el grupo entero y el filtro es una prueba de él.
    return (g === filtro) || (p === grupoFiltro)
  })
}

/** «1.500m», «400 m v.», «3.000 m obst.» (Mundo Atletismo) → prueba del tablón. */
export function pruebaDesdeMA(ma: string | undefined): string | null {
  if (!ma) return null
  const n = normalizar(ma).replace(/\s+/g, '')
  if (/marcha/.test(n)) return 'Marcha'
  if (/ruta|maraton/.test(n)) return 'Ruta'
  if (/obst/.test(n)) return '3.000 m obstáculos'
  const v = n.match(/^(\d+)mv/)
  if (v) return ({ '60': '60 m vallas', '100': '100 m vallas', '110': '110 m vallas', '400': '400 m vallas' } as Record<string, string>)[v[1]] ?? 'Vallas'
  const m = n.match(/^(\d+)m$/)
  if (m) {
    const t = ['60', '100', '200', '400', '800', '1500', '3000', '5000', '10000'].find((x) => x === m[1])
    if (t) return GRUPOS_PRUEBAS.flatMap((g) => g.pruebas).find((p) => p.replace(/\D/g, '') === t) ?? null
  }
  for (const p of ['Altura', 'Pértiga', 'Longitud', 'Peso', 'Disco', 'Martillo', 'Jabalina']) {
    if (n.startsWith(normalizar(p))) return p
  }
  if (n.startsWith('triple')) return 'Triple salto'
  if (/decat|heptat|pentat/.test(n)) return 'Combinadas'
  return null
}
