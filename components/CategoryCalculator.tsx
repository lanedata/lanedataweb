'use client'

import { useMemo, useState } from 'react'
import {
  categoriaPara,
  trayectoria,
  grupoMaster,
  edadEn,
  cumpleEn,
  parseFecha,
  FECHA_LARGA,
} from '@/lib/categorias'
import { LabField, Metric, inputCls, MONO, Segmented } from './lab/ui'

const CURRENT_SEASON = new Date().getFullYear()
const SEASONS = Array.from({ length: 7 }, (_, i) => CURRENT_SEASON - 1 + i)

export function CategoryCalculator() {
  const [fecha, setFecha] = useState('')
  const [sexo, setSexo] = useState<'M' | 'F'>('M')
  const [season, setSeason] = useState(CURRENT_SEASON)

  const calc = useMemo(() => {
    const birth = parseFecha(fecha)
    if (!birth) return null
    const birthYear = birth.getFullYear()
    if (birthYear < 1900 || birthYear > CURRENT_SEASON) return null

    const cat = categoriaPara(birthYear, season)
    const edadTemporada = season - birthYear

    // Máster: cuenta el cumpleaños, no el año. Puede cambiar de grupo a mitad de temporada.
    const inicio = new Date(season, 0, 1)
    const cumple = cumpleEn(birth, season)
    const edadInicio = edadEn(birth, inicio)
    const edadFinal = edadEn(birth, new Date(season, 11, 31))
    const master = {
      antes: grupoMaster(edadInicio),
      despues: grupoMaster(edadFinal),
      cumple,
      edadInicio,
      edadFinal,
    }

    return { birth, birthYear, cat, edadTemporada, master, tray: trayectoria(birthYear) }
  }, [fecha, season])

  const prefix = sexo === 'M' ? 'M' : 'F'

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <LabField label="Fecha de nacimiento">
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className={inputCls}
              max={`${CURRENT_SEASON}-12-31`}
            />
          </LabField>
          <LabField label="Temporada">
            <select value={season} onChange={e => setSeason(Number(e.target.value))} className={inputCls}>
              {SEASONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </LabField>
          <div className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>Sexo (grupo máster)</span>
            <div className="h-[46px] flex items-center">
              <Segmented
                options={[{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Femenino' }]}
                value={sexo}
                onChange={v => setSexo(v as 'M' | 'F')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {calc ? (
          <div className="flex flex-wrap gap-x-10 gap-y-5 items-end">
            <Metric primary value={calc.cat.label} label={`categoría RFEA · temporada ${season}`} />
            <Metric value={`${calc.edadTemporada}`} label="edad en la temporada" />
            {calc.master.antes && (
              <Metric
                value={`${prefix}${calc.master.antes}`}
                label={
                  calc.master.despues !== calc.master.antes
                    ? `grupo máster hasta el cumpleaños`
                    : 'grupo máster (WMA)'
                }
              />
            )}
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            {fecha ? 'Fecha no válida.' : 'Introduce tu fecha de nacimiento.'}
          </p>
        )}
      </div>

      {calc && (
        <>
          {/* Cambio de grupo máster a mitad de temporada */}
          {calc.master.despues && calc.master.despues !== calc.master.antes && (
            <div className="border-t border-ink/[0.14] bg-mint/[0.09] px-5 sm:px-7 py-4">
              <p className="text-sm text-ink/70">
                {calc.master.antes ? (
                  <>Pasas de <strong className="font-semibold text-ink">{prefix}{calc.master.antes}</strong> a </>
                ) : (
                  <>Entras en categoría máster (<strong className="font-semibold text-ink">{prefix}{calc.master.despues}</strong>) </>
                )}
                {calc.master.antes && <strong className="font-semibold text-ink">{prefix}{calc.master.despues}</strong>}
                {' '}el <strong className="font-semibold text-ink">{FECHA_LARGA.format(calc.master.cumple)}</strong>,
                el día que cumples {calc.master.edadFinal} años. Los grupos máster van por edad exacta el día de la
                competición, no por año de nacimiento.
              </p>
            </div>
          )}

          {/* Trayectoria */}
          <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
            <p className={`${MONO} text-ink/40 mb-3`}>Tu recorrido por categorías · nacido en {calc.birthYear}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {calc.tray.map(({ cat, desde, hasta }) => {
                const on = cat.id === calc.cat.id
                const past = hasta !== null && hasta < season
                return (
                  <div
                    key={cat.id}
                    className={`border px-3 py-2.5 transition-colors ${
                      on
                        ? 'border-ink bg-ink'
                        : past
                          ? 'border-ink/[0.06] bg-cream/25 opacity-55'
                          : 'border-ink/[0.14] bg-cream/40'
                    }`}
                  >
                    <p className={`font-mono text-[0.56rem] tracking-wider uppercase ${on ? 'text-mint' : 'text-ink/40'}`}>
                      {cat.label}
                    </p>
                    <p className={`text-sm font-semibold tabular-nums mt-0.5 ${on ? 'text-cream' : 'text-ink'}`}>
                      {hasta === null ? `desde ${desde}` : desde === hasta ? `${desde}` : `${desde}–${hasta}`}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-[0.7rem] text-ink/45 leading-relaxed">
              La categoría RFEA se fija por <strong className="text-ink/65">año de nacimiento</strong>: se es Sub-X
              durante toda la temporada si la edad cumplida ese año es menor que X. Un atleta puede competir en su
              categoría y también en absoluta cuando el reglamento de la prueba lo permite. Los grupos máster
              ({prefix}35, {prefix}40, {prefix}45…) sí dependen de la edad exacta el día de la competición.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
