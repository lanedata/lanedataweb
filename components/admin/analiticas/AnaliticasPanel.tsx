'use client'

// Panel de analíticas. Los agregados los calcula Postgres (funciones
// analytics_* de supabase/telemetry-schema.sql) en vez de traerse miles de
// filas al navegador: el panel solo pinta.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/telemetry/errors'
import { countryFlag, countryName } from '@/lib/telemetry/geo'
import { csvFilename, downloadCsv, toCsv, type CsvColumn } from '@/lib/telemetry/csv'
import {
  FEATURE_LABELS,
  type AnalyticsOverview,
  type DayRow,
  type DimensionRow,
  type FeatureRow,
  type HourRow,
  type PageRow,
} from '@/lib/telemetry/types'
import { BarChart, Card, RankChart, StatTile, type BarPoint, type RankRow } from './charts'

const RANGOS = [
  { id: '7', label: '7 días', dias: 7 },
  { id: '30', label: '30 días', dias: 30 },
  { id: '90', label: '90 días', dias: 90 },
  { id: '365', label: '12 meses', dias: 365 },
] as const

interface Datos {
  overview: AnalyticsOverview | null
  dias: DayRow[]
  horas: HourRow[]
  paginas: PageRow[]
  paises: DimensionRow[]
  dispositivos: DimensionRow[]
  navegadores: DimensionRow[]
  sistemas: DimensionRow[]
  origenes: DimensionRow[]
  funcionalidades: FeatureRow[]
}

const VACIO: Datos = {
  overview: null, dias: [], horas: [], paginas: [], paises: [],
  dispositivos: [], navegadores: [], sistemas: [], origenes: [], funcionalidades: [],
}

export function AnaliticasPanel() {
  const [rango, setRango] = useState<string>('30')
  const [datos, setDatos] = useState<Datos>(VACIO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tieneDatos, setTieneDatos] = useState(false)

  const dias = RANGOS.find((r) => r.id === rango)?.dias ?? 30

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    const hasta = new Date()
    hasta.setHours(23, 59, 59, 999)
    const desde = new Date(hasta.getTime() - dias * 86_400_000)
    desde.setHours(0, 0, 0, 0)

    const p = { p_from: desde.toISOString(), p_to: hasta.toISOString() }
    const supabase = createClient()

    try {
      const [ov, day, hour, pages, country, device, browser, os, ref, feats] = await Promise.all([
        supabase.rpc('analytics_overview', p),
        supabase.rpc('analytics_by_day', p),
        supabase.rpc('analytics_by_hour', p),
        supabase.rpc('analytics_pages', { ...p, p_limit: 20 }),
        supabase.rpc('analytics_dimension', { ...p, p_dim: 'country', p_limit: 15 }),
        supabase.rpc('analytics_dimension', { ...p, p_dim: 'device', p_limit: 5 }),
        supabase.rpc('analytics_dimension', { ...p, p_dim: 'browser', p_limit: 8 }),
        supabase.rpc('analytics_dimension', { ...p, p_dim: 'os', p_limit: 8 }),
        supabase.rpc('analytics_dimension', { ...p, p_dim: 'referrer_host', p_limit: 12 }),
        supabase.rpc('analytics_features', p),
      ])

      const fallo = [ov, day, hour, pages, country, device, browser, os, ref, feats].find((r) => r.error)
      if (fallo?.error) throw fallo.error

      setDatos({
        overview: (ov.data as AnalyticsOverview[])?.[0] ?? null,
        dias: (day.data as DayRow[]) ?? [],
        horas: (hour.data as HourRow[]) ?? [],
        paginas: (pages.data as PageRow[]) ?? [],
        paises: (country.data as DimensionRow[]) ?? [],
        dispositivos: (device.data as DimensionRow[]) ?? [],
        navegadores: (browser.data as DimensionRow[]) ?? [],
        sistemas: (os.data as DimensionRow[]) ?? [],
        origenes: (ref.data as DimensionRow[]) ?? [],
        funcionalidades: (feats.data as FeatureRow[]) ?? [],
      })
      setTieneDatos(true)
    } catch (e) {
      const msg = errorMessage(e)
      setError(
        /could not find the function|does not exist|schema cache/i.test(msg)
          ? 'Faltan las tablas o las funciones de analítica. Ejecuta supabase/telemetry-schema.sql en el SQL Editor de Supabase.'
          : msg
      )
    } finally {
      setCargando(false)
    }
  }, [dias])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // ── Series para los gráficos ───────────────────────────────────────────────

  // Por encima de ~120 días las barras diarias se convierten en pelusa: se
  // agrupa por semanas y el gráfico sigue leyéndose.
  const serieDias = useMemo<BarPoint[]>(() => {
    const filas = datos.dias
    if (filas.length <= 120) {
      return filas.map((d) => ({
        key: d.day,
        value: d.views,
        axis: fechaCorta(d.day),
        tooltip: `${fechaLarga(d.day)} · ${d.views.toLocaleString('es-ES')} visitas · ${d.sessions.toLocaleString('es-ES')} sesiones`,
      }))
    }
    const semanas: BarPoint[] = []
    for (let i = 0; i < filas.length; i += 7) {
      const bloque = filas.slice(i, i + 7)
      const views = bloque.reduce((s, d) => s + d.views, 0)
      const sessions = bloque.reduce((s, d) => s + d.sessions, 0)
      semanas.push({
        key: bloque[0].day,
        value: views,
        axis: fechaCorta(bloque[0].day),
        tooltip: `Semana del ${fechaLarga(bloque[0].day)} · ${views.toLocaleString('es-ES')} visitas · ${sessions.toLocaleString('es-ES')} sesiones`,
      })
    }
    return semanas
  }, [datos.dias])

  const serieHoras = useMemo<BarPoint[]>(
    () =>
      datos.horas.map((h) => ({
        key: String(h.hour),
        value: h.views,
        axis: `${String(h.hour).padStart(2, '0')}`,
        tooltip: `De ${String(h.hour).padStart(2, '0')}:00 a ${String(h.hour).padStart(2, '0')}:59 · ${h.views.toLocaleString('es-ES')} visitas`,
      })),
    [datos.horas]
  )

  const filasPaises = useMemo<RankRow[]>(
    () =>
      datos.paises
        .filter((p) => p.label !== '(desconocido)')
        .map((p) => ({
          label: countryName(p.label),
          value: p.views,
          display: p.views.toLocaleString('es-ES'),
          meta: `${p.sessions} ses.`,
          prefix: countryFlag(p.label),
        })),
    [datos.paises]
  )

  const filasPaginas = useMemo<RankRow[]>(
    () =>
      datos.paginas.map((p) => ({
        label: p.path,
        value: p.views,
        display: p.views.toLocaleString('es-ES'),
        meta: p.avg_seconds ? duracion(p.avg_seconds) : '—',
      })),
    [datos.paginas]
  )

  const filasFuncionalidades = useMemo<RankRow[]>(() => {
    // Se agrupa por tipo de evento; la etiqueta concreta va en el detalle.
    const porNombre = new Map<string, { uses: number; sessions: number }>()
    for (const f of datos.funcionalidades) {
      const acc = porNombre.get(f.name) ?? { uses: 0, sessions: 0 }
      acc.uses += f.uses
      acc.sessions = Math.max(acc.sessions, f.sessions)
      porNombre.set(f.name, acc)
    }
    return [...porNombre.entries()]
      .sort((a, b) => b[1].uses - a[1].uses)
      .map(([name, v]) => ({
        label: FEATURE_LABELS[name] ?? name,
        value: v.uses,
        display: v.uses.toLocaleString('es-ES'),
        meta: `${v.sessions} ses.`,
      }))
  }, [datos.funcionalidades])

  const rank = (filas: DimensionRow[]): RankRow[] =>
    filas.map((d) => ({
      label: d.label,
      value: d.views,
      display: d.views.toLocaleString('es-ES'),
      meta: `${d.sessions} ses.`,
    }))

  // ── Exportación ────────────────────────────────────────────────────────────

  function exportar(
    nombre: string,
    filas: Record<string, unknown>[],
    columnas: CsvColumn<Record<string, unknown>>[]
  ) {
    downloadCsv(csvFilename(`lanedata-${nombre}-${dias}d`), toCsv(filas, columnas))
  }

  const col = (header: string, key: string): CsvColumn<Record<string, unknown>> => ({
    key,
    header,
    value: (r) => (r[key] as string | number | null) ?? '',
  })

  const exportaciones: { id: string; label: string; run: () => void; n: number }[] = [
    {
      id: 'dia',
      label: 'Por día',
      n: datos.dias.length,
      run: () =>
        exportar('visitas-por-dia', datos.dias as unknown as Record<string, unknown>[], [
          col('Fecha', 'day'),
          col('Visitas', 'views'),
          col('Sesiones', 'sessions'),
        ]),
    },
    {
      id: 'paginas',
      label: 'Páginas',
      n: datos.paginas.length,
      run: () =>
        exportar('paginas', datos.paginas as unknown as Record<string, unknown>[], [
          col('Ruta', 'path'),
          col('Visitas', 'views'),
          col('Sesiones', 'sessions'),
          col('Segundos de media', 'avg_seconds'),
        ]),
    },
    {
      id: 'paises',
      label: 'Países',
      n: datos.paises.length,
      run: () =>
        exportar(
          'paises',
          datos.paises.map((p) => ({
            codigo: p.label,
            pais: p.label === '(desconocido)' ? 'Desconocido' : countryName(p.label),
            views: p.views,
            sessions: p.sessions,
          })) as unknown as Record<string, unknown>[],
          [col('Codigo', 'codigo'), col('Pais', 'pais'), col('Visitas', 'views'), col('Sesiones', 'sessions')]
        ),
    },
    {
      id: 'funcionalidades',
      label: 'Funcionalidades',
      n: datos.funcionalidades.length,
      run: () =>
        exportar(
          'funcionalidades',
          datos.funcionalidades.map((f) => ({
            evento: FEATURE_LABELS[f.name] ?? f.name,
            clave: f.name,
            detalle: f.label,
            uses: f.uses,
            sessions: f.sessions,
          })) as unknown as Record<string, unknown>[],
          [
            col('Funcionalidad', 'evento'),
            col('Clave', 'clave'),
            col('Detalle', 'detalle'),
            col('Usos', 'uses'),
            col('Sesiones', 'sessions'),
          ]
        ),
    },
  ]

  const ov = datos.overview

  return (
    <div>
      <div className="section-label">panel · audiencia</div>
      <h1 className="section-title text-ink">Analíticas</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/55">
        Medición propia, sin cookies y sin terceros. Cuenta sesiones, no personas: alguien que
        vuelve mañana suma una sesión nueva.
      </p>

      {/* Una sola fila de filtros, arriba, que manda sobre todos los bloques. */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-b border-ink/[0.14] pb-5">
        <div className="flex border border-ink/20">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRango(r.id)}
              aria-pressed={rango === r.id}
              className={`px-3 py-2 label-mono transition-colors ${
                rango === r.id ? 'bg-ink text-cream' : 'text-ink/50 hover:bg-cream hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => void cargar()}
          className="border border-ink/20 px-3 py-2 label-mono text-ink/60 transition-colors hover:border-ink hover:text-ink"
        >
          Recargar
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="label-mono text-ink/35">Exportar CSV</span>
          {exportaciones.map((e) => (
            <button
              key={e.id}
              onClick={e.run}
              disabled={!e.n}
              className="border border-ink/20 px-3 py-2 label-mono text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-6 border border-ink/20 bg-cream px-4 py-3 text-sm text-ink/70">{error}</p>
      )}

      {!tieneDatos && cargando ? (
        <p className="mt-10 label-mono text-ink/30">Cargando…</p>
      ) : (
        // Al recargar se mantiene lo anterior atenuado: nada de esqueletos que
        // hacen saltar la página.
        <div className={cargando ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'}>
          <div className="mt-8 grid gap-px bg-ink/[0.14] sm:grid-cols-2 lg:grid-cols-5">
            <StatTile
              valor={(ov?.views ?? 0).toLocaleString('es-ES')}
              label="Páginas vistas"
            />
            <StatTile
              valor={(ov?.sessions ?? 0).toLocaleString('es-ES')}
              label="Sesiones"
              nota="Una por pestaña"
            />
            <StatTile
              valor={ov?.avg_seconds ? duracion(ov.avg_seconds) : '—'}
              label="Duración media"
              nota="Solo tiempo en pantalla"
            />
            <StatTile
              valor={String(ov?.countries ?? 0)}
              label="Países"
            />
            <StatTile
              valor={ov?.bounce_rate != null ? `${ov.bounce_rate}%` : '—'}
              label="Solo una página"
              nota="Sesiones que no pasan de la primera"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card
              titulo="Visitas por día"
              pista={
                serieDias.length && datos.dias.length > 120
                  ? 'Agrupado por semanas para que se lea.'
                  : undefined
              }
              className="lg:col-span-2"
            >
              <BarChart data={serieDias} height={190} />
            </Card>

            <Card titulo="A qué hora se lee" pista="Hora peninsular.">
              <BarChart data={serieHoras} height={190} />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card titulo="Páginas más vistas" pista="A la derecha, el tiempo medio en cada una.">
              <RankChart rows={filasPaginas} />
            </Card>

            <Card titulo="Países" pista="Deducido de la zona horaria del navegador, no de la IP.">
              <RankChart rows={filasPaises} empty="Todavía sin país identificado" />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card
              titulo="Qué usa la gente"
              pista="Calculadoras, búsquedas, artículos compartidos y demás funcionalidades."
            >
              <RankChart rows={filasFuncionalidades} empty="Aún no hay uso registrado" />
              {datos.funcionalidades.length > 0 && (
                <details className="mt-6 border-t border-ink/[0.14] pt-4">
                  <summary className="cursor-pointer label-mono text-ink/40 hover:text-ink">
                    Ver el detalle ({datos.funcionalidades.length} combinaciones)
                  </summary>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink/[0.14]">
                          <th className="px-2 py-2 text-left label-mono text-ink/45">Funcionalidad</th>
                          <th className="px-2 py-2 text-left label-mono text-ink/45">Detalle</th>
                          <th className="px-2 py-2 text-right label-mono text-ink/45">Usos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.funcionalidades.map((f) => (
                          <tr key={`${f.name}-${f.label}`} className="border-b border-ink/[0.06] last:border-0">
                            <td className="px-2 py-2 text-ink/70">{FEATURE_LABELS[f.name] ?? f.name}</td>
                            <td className="px-2 py-2 font-mono text-xs text-ink/50">{f.label}</td>
                            <td className="px-2 py-2 text-right font-mono text-xs text-ink tabular-nums">
                              {f.uses.toLocaleString('es-ES')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </Card>

            <Card titulo="De dónde llega la gente" pista="Dominio de procedencia. El tráfico directo no aparece.">
              <RankChart rows={rank(datos.origenes.filter((o) => o.label !== '(desconocido)'))} empty="Todo el tráfico es directo" />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card titulo="Dispositivo">
              <RankChart rows={rank(datos.dispositivos)} />
            </Card>
            <Card titulo="Navegador">
              <RankChart rows={rank(datos.navegadores)} />
            </Card>
            <Card titulo="Sistema operativo">
              <RankChart rows={rank(datos.sistemas)} />
            </Card>
          </div>

          <p className="mt-10 text-xs leading-relaxed text-ink/35">
            Los datos se conservan 14 meses y se borran solos después, tal y como promete la
            política de privacidad. En desarrollo no se envía nada: estas cifras solo se llenan
            con el sitio publicado.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Formato ──────────────────────────────────────────────────────────────────

function duracion(segundos: number): string {
  const s = Math.round(segundos)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return r ? `${m} min ${r} s` : `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

function fechaCorta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}
