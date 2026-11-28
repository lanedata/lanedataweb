'use client'

// Barra de filtros del tablón (y de «Clubes que buscan atletas»): buscador,
// familias de pruebas con su recuento, prueba concreta, equipo, zona y, si se
// pide, compensación RFEA. Todo a un toque y con los filtros activos a la
// vista para quitarlos uno a uno.

import { normalizar, type Anuncio } from '@/lib/fichajes/types'
import { GRUPOS_PRUEBAS, ZONAS, encajaPrueba } from '@/lib/fichajes/tablon'

export type FiltroComp = 'todas' | 'sin' | '500' | '1000' | '2000'
export interface Filtros {
  texto: string
  familia: string
  prueba: string
  genero: '' | 'H' | 'M'
  zona: string
  comp: FiltroComp
}
export const FILTROS_VACIOS: Filtros = { texto: '', familia: '', prueba: '', genero: '', zona: '', comp: 'todas' }

const COMP_NOMBRE: Record<FiltroComp, string> = {
  todas: 'Cualquier compensación', sin: 'Sin compensación', '500': 'Hasta 500 €', '1000': 'Hasta 1.000 €', '2000': 'Hasta 2.000 €',
}

/** ¿Pasa el anuncio los filtros? `comp`: compensación de cada anuncio de atleta. */
export function pasa(a: Anuncio, f: Filtros, comp?: Record<string, number | null>, sinPrueba?: boolean): boolean {
  const prueba = f.prueba || f.familia
  if (!sinPrueba && prueba && !encajaPrueba(a.pruebas, prueba)) return false
  if (f.zona && a.zona && a.zona !== f.zona && a.zona !== 'Cualquier zona') return false
  if (f.genero && a.genero && a.genero !== 'X' && a.genero !== f.genero) return false
  if (f.texto.trim()) {
    const q = normalizar(f.texto).split(' ').filter(Boolean)
    const hay = normalizar([a.autor, a.club_actual, a.pruebas, a.zona, a.busca, a.ofrece, a.texto].filter(Boolean).join(' '))
    if (!q.every((p) => hay.includes(p))) return false
  }
  if (f.comp !== 'todas' && comp) {
    if (a.tipo !== 'atleta') return false
    const e = comp[a.id] ?? null
    if (f.comp === 'sin' ? e !== null : e === null || e > Number(f.comp)) return false
  }
  return true
}

export function hayFiltros(f: Filtros) {
  return Boolean(f.texto.trim() || f.familia || f.prueba || f.genero || f.zona || f.comp !== 'todas')
}

const chip = (activo: boolean) =>
  `shrink-0 border px-2.5 py-1 text-[0.78rem] leading-tight transition-colors ${
    activo ? 'border-ink bg-ink text-cream' : 'border-ink/20 bg-paper text-ink/75 hover:border-ink/50'}`

export function BarraFiltros({
  anuncios, f, onCambio, conCompensacion = false, comp,
}: {
  anuncios: Anuncio[]
  f: Filtros
  onCambio: (f: Filtros) => void
  conCompensacion?: boolean
  comp?: Record<string, number | null>
}) {
  const pon = (cambios: Partial<Filtros>) => onCambio({ ...f, ...cambios })
  // Recuentos: cuántos anuncios quedarían con cada familia (respetando el resto de filtros).
  const base = anuncios.filter((a) => pasa(a, f, comp, true))
  const cuenta = (p: string) => base.filter((a) => encajaPrueba(a.pruebas, p)).length
  const grupo = GRUPOS_PRUEBAS.find((g) => g.grupo === f.familia)
  const zonasConAnuncios = new Set(anuncios.map((a) => a.zona).filter(Boolean))

  const activos: { etiqueta: string; quitar: Partial<Filtros> }[] = [
    f.texto.trim() && { etiqueta: `«${f.texto.trim()}»`, quitar: { texto: '' } },
    (f.prueba || f.familia) && { etiqueta: f.prueba || f.familia, quitar: { prueba: '', familia: f.prueba ? f.familia : '' } },
    f.genero && { etiqueta: f.genero === 'H' ? 'Hombres' : 'Mujeres', quitar: { genero: '' as const } },
    f.zona && { etiqueta: `📍 ${f.zona}`, quitar: { zona: '' } },
    f.comp !== 'todas' && { etiqueta: COMP_NOMBRE[f.comp], quitar: { comp: 'todas' as const } },
  ].filter(Boolean) as { etiqueta: string; quitar: Partial<Filtros> }[]

  return (
    <div className="border border-ink/[0.14] bg-cream/40">
      {/* Buscador + equipo + zona */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/[0.1] p-3">
        <label className="relative min-w-[12rem] flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.85rem] text-ink/35">⌕</span>
          <input type="search" value={f.texto} onChange={(e) => pon({ texto: e.target.value })}
            placeholder="Busca club, prueba, zona…" aria-label="Buscar en el tablón"
            className="w-full border border-ink/[0.15] bg-paper py-2 pl-8 pr-3 text-[0.85rem] text-ink placeholder:text-ink/35 focus:border-ink/35 focus:outline-none focus:ring-2 focus:ring-mint/40" />
        </label>
        <div role="group" aria-label="Equipo" className="flex border border-ink/20">
          {([['', 'Todos'], ['H', 'Hombres'], ['M', 'Mujeres']] as const).map(([v, t]) => (
            <button key={v || 'todos'} type="button" aria-pressed={f.genero === v} onClick={() => pon({ genero: v })}
              className={`px-2.5 py-1.5 text-[0.78rem] transition-colors ${f.genero === v ? 'bg-ink text-cream' : 'bg-paper text-ink/70 hover:text-ink'}`}>
              {t}
            </button>
          ))}
        </div>
        <select aria-label="Zona" value={f.zona} onChange={(e) => pon({ zona: e.target.value })}
          className="border border-ink/20 bg-paper px-2.5 py-1.5 text-[0.8rem] text-ink focus:outline-none focus:ring-2 focus:ring-mint/40">
          <option value="">📍 Toda España</option>
          {ZONAS.filter((z) => z !== 'Cualquier zona').map((z) => (
            <option key={z} value={z}>{z}{zonasConAnuncios.has(z) ? '' : ' · sin anuncios'}</option>
          ))}
        </select>
        {conCompensacion && (
          <select aria-label="Compensación" value={f.comp} onChange={(e) => pon({ comp: e.target.value as FiltroComp })}
            className="border border-ink/20 bg-paper px-2.5 py-1.5 text-[0.8rem] text-ink focus:outline-none focus:ring-2 focus:ring-mint/40">
            {(Object.keys(COMP_NOMBRE) as FiltroComp[]).map((k) => <option key={k} value={k}>{COMP_NOMBRE[k]}</option>)}
          </select>
        )}
      </div>

      {/* Pruebas: familias con recuento, y al elegir una, sus pruebas */}
      <div className="p-3">
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:overflow-visible">
          {GRUPOS_PRUEBAS.map((g) => {
            const n = cuenta(g.grupo)
            return (
              <button key={g.grupo} type="button" aria-pressed={f.familia === g.grupo}
                onClick={() => pon({ familia: f.familia === g.grupo ? '' : g.grupo, prueba: '' })}
                className={`${chip(f.familia === g.grupo)} ${n === 0 && f.familia !== g.grupo ? 'opacity-45' : ''}`}>
                {g.grupo}
                <span className={`ml-1.5 font-mono text-[0.68rem] ${f.familia === g.grupo ? 'text-mint' : 'text-ink/40'}`}>{n}</span>
              </button>
            )
          })}
        </div>
        {grupo && grupo.pruebas.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-l-2 border-ink/15 pl-2.5">
            {grupo.pruebas.map((p) => (
              <button key={p} type="button" aria-pressed={f.prueba === p}
                onClick={() => pon({ prueba: f.prueba === p ? '' : p })} className={chip(f.prueba === p)}>
                {p}
                <span className={`ml-1.5 font-mono text-[0.68rem] ${f.prueba === p ? 'text-mint' : 'text-ink/40'}`}>{cuenta(p)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros activos */}
      {activos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-ink/[0.1] px-3 py-2">
          {activos.map((x) => (
            <button key={x.etiqueta} type="button" onClick={() => pon(x.quitar)}
              className="flex items-center gap-1.5 bg-mint/40 px-2 py-0.5 text-[0.75rem] text-ink hover:bg-mint/70">
              {x.etiqueta} <span aria-hidden="true" className="text-ink/50">✕</span>
            </button>
          ))}
          <button type="button" onClick={() => onCambio(FILTROS_VACIOS)} className="ml-auto label-mono text-[0.56rem] text-ink/50 underline hover:text-ink">
            quitar todo
          </button>
        </div>
      )}
    </div>
  )
}
