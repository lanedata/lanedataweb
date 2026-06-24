// Tipos y utilidades (client-safe) del calendario RFEA generado por el scraper.
// El loader que lee el JSON con fs vive en lib/competiciones-data.ts (server only).

export interface RfeaPrueba {
  id?: string | null
  nombre: string
  n_inscritos?: number | null
}

export interface RfeaInscripcion {
  abierta?: boolean | null
  fecha_limite?: string | null
  url?: string | null
  instrucciones?: string | null
}

export interface RfeaDocumento {
  nombre: string
  url: string
}

export interface RfeaCompeticion {
  id?: string | null
  nombre: string
  ambito?: string | null
  disciplina?: string | null
  fecha_inicio: string
  fecha_fin: string
  lugar?: string | null
  pruebas: RfeaPrueba[]
  inscripcion: RfeaInscripcion
  url_detalle?: string | null
  url_inscritos?: string | null
  url_resultados?: string | null
  url_directo?: string | null
  url_callroom?: string | null
  url_reglamento?: string | null
  url_calendario_federacion?: string | null
  comunidad?: string | null
  documentos: RfeaDocumento[]
  fuente?: string
}

/**
 * Normaliza el nombre de una prueba a su evento base, sin género, categoría ni
 * pesos/alturas: "100m vallas (0,91) MASC. AL - U16M" → "100m vallas".
 */
export function eventoBase(nombre: string): string {
  let s = nombre.split(/\s+(?:MASC\.|FEM\.)/)[0]
  s = s.replace(/\([^)]*\)/g, '')          // pesos/alturas
  s = s.replace(/\s*-\s*[A-Z0-9/]+$/, '')  // sufijos de categoría sueltos
  return s.replace(/\s+/g, ' ').trim()
}

/** Lista única de eventos base, en orden de aparición. */
export function pruebasUnicas(pruebas: RfeaPrueba[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of pruebas) {
    const e = eventoBase(p.nombre)
    if (e && !seen.has(e.toLowerCase())) {
      seen.add(e.toLowerCase())
      out.push(e)
    }
  }
  return out
}
