'use client'

// Panel de errores: lee `error_logs`, agrupa los que son el mismo fallo y deja
// exportarlo todo a CSV para pasárselo a quien lo tenga que arreglar.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/telemetry/errors'
import { csvDate, csvFilename, downloadCsv, toCsv, type CsvColumn } from '@/lib/telemetry/csv'
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  type ErrorGroup,
  type ErrorLog,
  type ErrorStatus,
} from '@/lib/telemetry/types'

const RANGOS = [
  { id: '1', label: '24 h', dias: 1 },
  { id: '7', label: '7 días', dias: 7 },
  { id: '30', label: '30 días', dias: 30 },
  { id: '90', label: '90 días', dias: 90 },
  { id: 'todo', label: 'Todo', dias: 0 },
] as const

const ESTADOS: (ErrorStatus | 'todos')[] = ['todos', 'nuevo', 'revisando', 'resuelto', 'ignorado']

/** Tope de filas que se traen del servidor. Suficiente y no revienta el navegador. */
const MAX_FILAS = 5000

export function ErroresPanel() {
  const [rango, setRango] = useState<string>('30')
  const [estado, setEstado] = useState<ErrorStatus | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [agrupar, setAgrupar] = useState(true)

  const [rows, setRows] = useState<ErrorLog[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  const desde = useMemo(() => {
    const dias = RANGOS.find((r) => r.id === rango)?.dias ?? 30
    if (!dias) return null
    return new Date(Date.now() - dias * 86_400_000).toISOString()
  }, [rango])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      let q = createClient()
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_FILAS)
      if (desde) q = q.gte('created_at', desde)

      const { data, error: err } = await q
      if (err) throw err
      setRows((data ?? []) as ErrorLog[])
    } catch (e) {
      const msg = errorMessage(e)
      setError(
        /relation .* does not exist|schema cache/i.test(msg)
          ? 'La tabla error_logs todavía no existe. Ejecuta supabase/telemetry-schema.sql en el SQL Editor de Supabase.'
          : msg
      )
    } finally {
      setCargando(false)
    }
  }, [desde])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // ── Filtrado en cliente ────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return rows.filter((r) => {
      if (estado !== 'todos' && r.status !== estado) return false
      if (!q) return true
      return [r.message, r.area, r.path, r.browser, r.user_action]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, estado, busqueda])

  const grupos = useMemo<ErrorGroup[]>(() => {
    const map = new Map<string, ErrorLog[]>()
    for (const r of filtradas) {
      const list = map.get(r.fingerprint)
      if (list) list.push(r)
      else map.set(r.fingerprint, [r])
    }
    return [...map.entries()]
      .map(([fingerprint, list]) => {
        // `filtradas` viene ordenada de más reciente a más antigua.
        const fechas = list.map((r) => r.created_at)
        return {
          fingerprint,
          latest: list[0],
          count: list.length,
          sessions: new Set(list.map((r) => r.session_id).filter(Boolean)).size,
          firstSeen: fechas[fechas.length - 1],
          lastSeen: fechas[0],
          rows: list,
        }
      })
      .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
  }, [filtradas])

  const nuevos = useMemo(() => rows.filter((r) => r.status === 'nuevo').length, [rows])

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function cambiarEstado(fingerprint: string, status: ErrorStatus) {
    const ids = filtradas.filter((r) => r.fingerprint === fingerprint).map((r) => r.id)
    if (!ids.length) return
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)))
    const { error: err } = await createClient().from('error_logs').update({ status }).in('id', ids)
    if (err) {
      setError(`No se pudo guardar el estado: ${err.message}`)
      void cargar()
    }
  }

  async function borrarGrupo(fingerprint: string) {
    const grupo = grupos.find((g) => g.fingerprint === fingerprint)
    if (!grupo) return
    if (!confirm(`Borrar ${grupo.count} registro(s) de este error? No se puede deshacer.`)) return
    const ids = grupo.rows.map((r) => r.id)
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
    const { error: err } = await createClient().from('error_logs').delete().in('id', ids)
    if (err) {
      setError(`No se pudo borrar: ${err.message}`)
      void cargar()
    }
  }

  // ── Exportación ────────────────────────────────────────────────────────────
  function exportarDetalle() {
    const columnas: CsvColumn<ErrorLog>[] = [
      { key: 'fecha', header: 'Fecha', value: (r) => csvDate(r.created_at) },
      { key: 'severidad', header: 'Severidad', value: (r) => r.severity },
      { key: 'origen', header: 'Origen', value: (r) => SOURCE_LABELS[r.source] ?? r.source },
      { key: 'estado', header: 'Estado', value: (r) => STATUS_LABELS[r.status] ?? r.status },
      { key: 'mensaje', header: 'Mensaje', value: (r) => r.message },
      { key: 'area', header: 'Zona', value: (r) => r.area },
      { key: 'ruta', header: 'Ruta', value: (r) => r.path },
      { key: 'accion', header: 'Que hacia el usuario', value: (r) => r.user_action },
      { key: 'navegador', header: 'Navegador', value: (r) => r.browser },
      { key: 'so', header: 'Sistema operativo', value: (r) => r.os },
      { key: 'dispositivo', header: 'Dispositivo', value: (r) => r.device },
      { key: 'viewport', header: 'Ventana', value: (r) => r.viewport },
      { key: 'idioma', header: 'Idioma', value: (r) => r.language },
      { key: 'referrer', header: 'Procedencia', value: (r) => r.referrer },
      { key: 'version', header: 'Version', value: (r) => r.app_version },
      { key: 'huella', header: 'Huella', value: (r) => r.fingerprint },
      { key: 'sesion', header: 'Sesion', value: (r) => r.session_id },
      {
        key: 'contexto',
        header: 'Contexto',
        value: (r) => (r.context ? JSON.stringify(r.context) : ''),
      },
      { key: 'notas', header: 'Notas', value: (r) => r.notes },
      { key: 'traza', header: 'Traza', value: (r) => r.stack },
    ]
    downloadCsv(csvFilename('lanedata-errores-detalle'), toCsv(filtradas, columnas))
  }

  function exportarAgrupado() {
    const columnas: CsvColumn<ErrorGroup>[] = [
      { key: 'veces', header: 'Veces', value: (g) => g.count },
      { key: 'sesiones', header: 'Sesiones afectadas', value: (g) => g.sessions },
      { key: 'mensaje', header: 'Mensaje', value: (g) => g.latest.message },
      { key: 'severidad', header: 'Severidad', value: (g) => g.latest.severity },
      {
        key: 'origen',
        header: 'Origen',
        value: (g) => SOURCE_LABELS[g.latest.source] ?? g.latest.source,
      },
      { key: 'estado', header: 'Estado', value: (g) => STATUS_LABELS[g.latest.status] },
      { key: 'zona', header: 'Zona', value: (g) => g.latest.area },
      { key: 'ruta', header: 'Ruta', value: (g) => g.latest.path },
      { key: 'accion', header: 'Que hacia el usuario', value: (g) => g.latest.user_action },
      { key: 'primera', header: 'Primera vez', value: (g) => csvDate(g.firstSeen) },
      { key: 'ultima', header: 'Ultima vez', value: (g) => csvDate(g.lastSeen) },
      {
        key: 'navegadores',
        header: 'Navegadores',
        value: (g) => [...new Set(g.rows.map((r) => r.browser).filter(Boolean))].join(', '),
      },
      {
        key: 'dispositivos',
        header: 'Dispositivos',
        value: (g) => [...new Set(g.rows.map((r) => r.device).filter(Boolean))].join(', '),
      },
      { key: 'huella', header: 'Huella', value: (g) => g.fingerprint },
      { key: 'notas', header: 'Notas', value: (g) => g.latest.notes },
      { key: 'traza', header: 'Traza (ultima)', value: (g) => g.latest.stack },
    ]
    downloadCsv(csvFilename('lanedata-errores'), toCsv(grupos, columnas))
  }

  // ── Interfaz ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="section-label">panel · diagnóstico</div>
      <h1 className="section-title text-ink">Errores</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/55">
        Todo lo que revienta en el navegador de quien visita lanedata acaba aquí. Filtra lo que
        te interese y descarga el CSV para pasárselo a quien lo tenga que arreglar.
      </p>

      {/* Resumen */}
      <div className="mt-10 grid gap-px bg-ink/[0.14] sm:grid-cols-4">
        <Metric valor={filtradas.length} label="Registros" />
        <Metric valor={grupos.length} label="Errores distintos" />
        <Metric valor={nuevos} label="Sin revisar" destacado={nuevos > 0} />
        <Metric
          valor={new Set(filtradas.map((r) => r.session_id).filter(Boolean)).size}
          label="Sesiones afectadas"
        />
      </div>

      {/* Controles */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented
          opciones={RANGOS.map((r) => ({ id: r.id, label: r.label }))}
          valor={rango}
          onChange={setRango}
        />

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as ErrorStatus | 'todos')}
          className="border border-ink/20 bg-paper px-3 py-2 label-mono text-ink focus:border-ink focus:outline-none"
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {s === 'todos' ? 'Todos los estados' : STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en el mensaje, la ruta…"
          className="min-w-[14rem] flex-1 border border-ink/20 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-ink focus:outline-none"
        />

        <label className="flex items-center gap-2 label-mono text-ink/55">
          <input
            type="checkbox"
            checked={agrupar}
            onChange={(e) => setAgrupar(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Agrupar iguales
        </label>

        <button
          onClick={() => void cargar()}
          className="border border-ink/20 px-3 py-2 label-mono text-ink/60 transition-colors hover:border-ink hover:text-ink"
        >
          Recargar
        </button>
      </div>

      {/* Exportación */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/[0.14] pt-4">
        <span className="label-mono text-ink/35">Exportar</span>
        <button
          onClick={exportarAgrupado}
          disabled={!grupos.length}
          className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 label-mono text-cream transition-colors hover:bg-mint hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <DownloadIcon /> CSV agrupado ({grupos.length})
        </button>
        <button
          onClick={exportarDetalle}
          disabled={!filtradas.length}
          className="inline-flex items-center gap-2 border border-ink/20 px-4 py-2.5 label-mono text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <DownloadIcon /> CSV detallado ({filtradas.length})
        </button>
        <span className="text-xs text-ink/35">
          El agrupado es el que interesa para arreglar; el detallado trae cada ocurrencia.
        </span>
      </div>

      {/* Estado de carga y errores */}
      {error && (
        <p className="mt-6 border border-ink/20 bg-cream px-4 py-3 text-sm text-ink/70">{error}</p>
      )}

      {cargando ? (
        <p className="mt-10 label-mono text-ink/30">Cargando…</p>
      ) : !filtradas.length ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center border border-ink/[0.14] bg-cream/40 p-12 text-center">
          <p className="font-brand text-xl font-bold text-ink/35">
            {rows.length ? 'Ningún error con esos filtros' : 'Ni un solo error registrado'}
          </p>
        </div>
      ) : agrupar ? (
        <ul className="mt-10 grid gap-px bg-ink/[0.14]">
          {grupos.map((g) => (
            <GrupoFila
              key={g.fingerprint}
              grupo={g}
              abierto={abierto === g.fingerprint}
              onToggle={() => setAbierto(abierto === g.fingerprint ? null : g.fingerprint)}
              onEstado={(s) => void cambiarEstado(g.fingerprint, s)}
              onBorrar={() => void borrarGrupo(g.fingerprint)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-10 overflow-x-auto border border-ink/[0.14]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink/[0.14] bg-cream/50">
                <Th>Fecha</Th>
                <Th>Mensaje</Th>
                <Th>Zona</Th>
                <Th>Navegador</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.slice(0, 300).map((r) => (
                <tr key={r.id} className="border-b border-ink/[0.08] last:border-0">
                  <Td mono>{formatoFecha(r.created_at)}</Td>
                  <Td>
                    <span className="line-clamp-2">{r.message}</span>
                  </Td>
                  <Td mono>{r.area ?? '—'}</Td>
                  <Td mono>
                    {r.browser ?? '—'} · {r.device ?? '—'}
                  </Td>
                  <Td mono>{STATUS_LABELS[r.status]}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length > 300 && (
            <p className="border-t border-ink/[0.14] px-4 py-3 label-mono text-ink/35">
              Mostrando 300 de {filtradas.length}. El CSV los lleva todos.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function GrupoFila({
  grupo,
  abierto,
  onToggle,
  onEstado,
  onBorrar,
}: {
  grupo: ErrorGroup
  abierto: boolean
  onToggle: () => void
  onEstado: (s: ErrorStatus) => void
  onBorrar: () => void
}) {
  const { latest } = grupo
  return (
    <li className="bg-paper">
      <button
        onClick={onToggle}
        aria-expanded={abierto}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-cream/60"
      >
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
            latest.severity === 'error'
              ? 'bg-red-500'
              : latest.severity === 'aviso'
                ? 'bg-amber-400'
                : 'bg-ink/25'
          }`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block break-words font-mono text-[0.8125rem] leading-relaxed text-ink">
            {latest.message}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 label-mono text-ink/40">
            <span>{SOURCE_LABELS[latest.source] ?? latest.source}</span>
            {latest.area && <span>{latest.area}</span>}
            {latest.user_action && <span>al {latest.user_action}</span>}
            <span>{formatoFecha(grupo.lastSeen)}</span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-brand text-2xl font-extrabold leading-none tracking-tight text-ink">
            {grupo.count}
          </span>
          <span className="mt-1 block label-mono text-ink/35">
            {grupo.sessions} ses.
          </span>
        </span>
        <span
          className={`mt-1 shrink-0 label-mono ${
            latest.status === 'nuevo'
              ? 'bg-mint px-2 py-1 text-ink'
              : latest.status === 'resuelto'
                ? 'text-ink/30'
                : 'text-ink/45'
          }`}
        >
          {STATUS_LABELS[latest.status]}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-ink/[0.14] bg-cream/40 p-5">
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Detalle k="Ruta" v={latest.path} />
            <Detalle k="Primera vez" v={formatoFecha(grupo.firstSeen)} />
            <Detalle k="Última vez" v={formatoFecha(grupo.lastSeen)} />
            <Detalle
              k="Navegadores"
              v={[...new Set(grupo.rows.map((r) => r.browser).filter(Boolean))].join(', ')}
            />
            <Detalle
              k="Dispositivos"
              v={[...new Set(grupo.rows.map((r) => r.device).filter(Boolean))].join(', ')}
            />
            <Detalle k="Versión" v={latest.app_version} />
            <Detalle k="Ventana" v={latest.viewport} />
            <Detalle k="Huella" v={grupo.fingerprint} />
          </dl>

          {latest.context && (
            <pre className="mt-4 overflow-x-auto border border-ink/[0.14] bg-paper p-3 font-mono text-[0.6875rem] leading-relaxed text-ink/70">
              {JSON.stringify(latest.context, null, 2)}
            </pre>
          )}

          {latest.stack && (
            <pre className="mt-4 max-h-72 overflow-auto border border-ink/[0.14] bg-ink p-4 font-mono text-[0.6875rem] leading-relaxed text-mint">
              {latest.stack}
            </pre>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="label-mono text-ink/35">Marcar como</span>
            {(['nuevo', 'revisando', 'resuelto', 'ignorado'] as ErrorStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onEstado(s)}
                disabled={latest.status === s}
                className={`px-3 py-2 label-mono transition-colors ${
                  latest.status === s
                    ? 'bg-ink text-cream'
                    : 'border border-ink/20 text-ink/60 hover:border-ink hover:text-ink'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            <button
              onClick={onBorrar}
              className="ml-auto px-3 py-2 label-mono text-ink/35 transition-colors hover:text-red-600"
            >
              Borrar registros
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function Detalle({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null
  return (
    <div className="flex gap-3">
      <dt className="label-mono shrink-0 text-ink/35">{k}</dt>
      <dd className="min-w-0 break-words font-mono text-xs text-ink/70">{v}</dd>
    </div>
  )
}

function Metric({
  valor,
  label,
  destacado = false,
}: {
  valor: number
  label: string
  destacado?: boolean
}) {
  return (
    <div className="bg-paper p-5">
      <div
        className={`font-brand text-3xl font-extrabold leading-none tracking-[-0.04em] ${
          destacado ? 'text-ink' : 'text-ink/80'
        }`}
      >
        {valor.toLocaleString('es-ES')}
      </div>
      <div className="mt-2 label-mono text-ink/40">{label}</div>
    </div>
  )
}

export function Segmented({
  opciones,
  valor,
  onChange,
}: {
  opciones: { id: string; label: string }[]
  valor: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex border border-ink/20">
      {opciones.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={valor === o.id}
          className={`px-3 py-2 label-mono transition-colors ${
            valor === o.id ? 'bg-ink text-cream' : 'text-ink/50 hover:bg-cream hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left label-mono text-ink/45">{children}</th>
}

function Td({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 align-top ${mono ? 'font-mono text-xs text-ink/60' : 'text-ink/80'}`}>
      {children}
    </td>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />
    </svg>
  )
}

function formatoFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
