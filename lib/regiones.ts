// Comunidades autónomas y adyacencia (para el filtro de "cuánto te mueves").

export const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra',
  'País Vasco', 'Ceuta', 'Melilla',
] as const

export type Comunidad = (typeof COMUNIDADES)[number]

// Comunidades limítrofes (frontera terrestre).
export const ADYACENTES: Record<string, string[]> = {
  'Andalucía': ['Extremadura', 'Castilla-La Mancha', 'Murcia'],
  'Aragón': ['Cataluña', 'Comunidad Valenciana', 'Castilla-La Mancha', 'Castilla y León', 'La Rioja', 'Navarra'],
  'Asturias': ['Galicia', 'Castilla y León', 'Cantabria'],
  'Baleares': [],
  'Canarias': [],
  'Cantabria': ['Asturias', 'Castilla y León', 'País Vasco'],
  'Castilla-La Mancha': ['Madrid', 'Castilla y León', 'Aragón', 'Comunidad Valenciana', 'Murcia', 'Andalucía', 'Extremadura'],
  'Castilla y León': ['Galicia', 'Asturias', 'Cantabria', 'País Vasco', 'La Rioja', 'Aragón', 'Castilla-La Mancha', 'Madrid', 'Extremadura'],
  'Cataluña': ['Aragón', 'Comunidad Valenciana'],
  'Comunidad Valenciana': ['Cataluña', 'Aragón', 'Castilla-La Mancha', 'Murcia'],
  'Extremadura': ['Castilla y León', 'Castilla-La Mancha', 'Andalucía'],
  'Galicia': ['Asturias', 'Castilla y León'],
  'La Rioja': ['País Vasco', 'Navarra', 'Aragón', 'Castilla y León'],
  'Madrid': ['Castilla y León', 'Castilla-La Mancha'],
  'Murcia': ['Andalucía', 'Castilla-La Mancha', 'Comunidad Valenciana'],
  'Navarra': ['País Vasco', 'La Rioja', 'Aragón'],
  'País Vasco': ['Cantabria', 'Castilla y León', 'La Rioja', 'Navarra'],
  'Ceuta': [],
  'Melilla': [],
}

/** Conjunto de comunidades alcanzables según el radio elegido. */
export function comunidadesEnRadio(origen: string, radio: 'comunidad' | 'cercanas' | 'nacional'): Set<string> | null {
  if (radio === 'nacional') return null // null = sin límite
  const set = new Set<string>([origen])
  if (radio === 'cercanas') for (const a of ADYACENTES[origen] ?? []) set.add(a)
  return set
}
