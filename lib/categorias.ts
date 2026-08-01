// Categorías de edad de la RFEA y grupos máster de World Masters Athletics.
//
// Regla RFEA: la categoría depende del AÑO de nacimiento, no del cumpleaños.
// Un atleta pertenece a "Sub-X" si durante toda la temporada tiene una edad
// estrictamente inferior a X, es decir: edad = año de temporada − año de nacimiento.
// (Ej.: en 2026 son Sub-23 los nacidos en 2004, 2005 y 2006.)
//
// Regla WMA/máster: aquí sí cuenta el cumpleaños. Se es máster desde el día en
// que se cumplen 35 años, y se cambia de grupo el día del cumpleaños.

export interface Categoria {
  id: string
  label: string
  /** Edad mínima y máxima (año de temporada − año de nacimiento). */
  from: number
  to: number
}

export const CATEGORIAS: Categoria[] = [
  { id: 'sub8',  label: 'Sub-8',     from: 0,  to: 7 },
  { id: 'sub10', label: 'Sub-10',    from: 8,  to: 9 },
  { id: 'sub12', label: 'Sub-12',    from: 10, to: 11 },
  { id: 'sub14', label: 'Sub-14',    from: 12, to: 13 },
  { id: 'sub16', label: 'Sub-16',    from: 14, to: 15 },
  { id: 'sub18', label: 'Sub-18',    from: 16, to: 17 },
  { id: 'sub20', label: 'Sub-20',    from: 18, to: 19 },
  { id: 'sub23', label: 'Sub-23',    from: 20, to: 22 },
  { id: 'abs',   label: 'Absoluta',  from: 23, to: 34 },
  { id: 'master',label: 'Máster',    from: 35, to: 200 },
]

/** Categoría RFEA para un año de nacimiento en una temporada dada. */
export function categoriaPara(birthYear: number, season: number): Categoria {
  const age = season - birthYear
  return CATEGORIAS.find(c => age >= c.from && age <= c.to) ?? CATEGORIAS[CATEGORIAS.length - 1]
}

/** Las categorías que recorre el atleta, con los años de temporada de cada una. */
export function trayectoria(birthYear: number) {
  return CATEGORIAS.map(c => ({
    cat: c,
    desde: birthYear + c.from,
    hasta: c.to >= 200 ? null : birthYear + c.to,
  }))
}

/** Grupo máster (M35, M40…) para una edad exacta. Null si aún no es máster. */
export function grupoMaster(age: number): string | null {
  if (age < 35) return null
  return `${Math.min(Math.floor(age / 5) * 5, 100)}`
}

/** Edad exacta cumplida en `on`. */
export function edadEn(birth: Date, on: Date): number {
  let age = on.getFullYear() - birth.getFullYear()
  const m = on.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age--
  return age
}

/** Fecha del cumpleaños dentro de un año concreto. */
export function cumpleEn(birth: Date, year: number): Date {
  return new Date(year, birth.getMonth(), birth.getDate())
}

/** Parsea "AAAA-MM-DD" a Date local. Null si no es válida. */
export function parseFecha(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

export const FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric', month: 'long', year: 'numeric',
})
