// Server-only: lee el JSON del scraper en build time.
// (No importar desde componentes 'use client'.)
import fs from 'node:fs'
import path from 'node:path'
import type { RfeaCompeticion } from './competiciones'

/** Lee public/data/competiciones.json. Devuelve [] si aún no existe o falla. */
export function loadCompeticiones(): RfeaCompeticion[] {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'competiciones.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as RfeaCompeticion[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
