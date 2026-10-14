'use client'

// Historias automáticas del mercado de fichajes. Cada fichaje publicado en el
// directo aparece aquí ya convertido en historia 1080×1920, con la plantilla
// que le toca (ver FichajeCards). Se puede cambiar la plantilla, retocar los
// textos y exportar el PNG. Los que aún no has exportado salen marcados como
// NUEVA, para que no se escape ninguno.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FICHAJE_COLUMNS, type Fichaje } from '@/lib/fichajes/types'
import { downloadPng, nodeToPng } from '../exportNode'
import { FichajeCard, PLANTILLA_NOMBRE, plantillaAuto, type Plantilla } from './FichajeCards'
import { partirNombre } from '@/lib/fichajes/types'
import { STORY_H, STORY_W } from './types'

const PREVIEW = 0.3
const CARD_W = Math.round(STORY_W * PREVIEW)
const CARD_H = Math.round(STORY_H * PREVIEW)
const EXPORTADAS_KEY = 'lanedata-historias-fichajes-exportadas'

type Rango = '7d' | 'todo'
type Estado = 'cargando' | 'listo' | 'sin-tabla' | 'error'

function leerExportadas(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(EXPORTADAS_KEY) || '[]')) } catch { return new Set() }
}
function guardarExportadas(s: Set<string>) {
  try { localStorage.setItem(EXPORTADAS_KEY, JSON.stringify([...s].slice(-500))) } catch { /* sin almacenamiento */ }
}

/** Nombre de fichero legible: 2026-10-14-garcia-lopez.png */
function nombreFichero(f: Fichaje): string {
  const { apellidos } = partirNombre(f.atleta)
  const slug = (apellidos || f.atleta).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `fichaje-${f.informado_en.slice(0, 10)}-${slug}`
}

export function FichajesHistorias() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [rango, setRango] = useState<Rango>('7d')
  const [forzadas, setForzadas] = useState<Record<string, Plantilla>>({})
  const [exportadas, setExportadas] = useState<Set<string>>(new Set())
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setExportadas(leerExportadas()) }, [])

  const cargar = useCallback(async () => {
    const supabase = createClient()
    let q = supabase
      .from('fichajes')
      .select(FICHAJE_COLUMNS)
      .eq('visible', true)
      .order('informado_en', { ascending: false })
      .limit(60)
    if (rango === '7d') q = q.gte('informado_en', new Date(Date.now() - 7 * 864e5).toISOString())
    const { data, error: err } = await q
    if (err) {
      setEstado(err.code === '42P01' || err.code === '42703' ? 'sin-tabla' : 'error')
      return
    }
    setFichajes((data as unknown as Fichaje[]) ?? [])
    setEstado('listo')
  }, [rango])

  useEffect(() => { cargar() }, [cargar])

  const pendientes = useMemo(() => fichajes.filter((f) => !exportadas.has(f.id)).length, [fichajes, exportadas])

  async function exportar(f: Fichaje): Promise<boolean> {
    const el = document.getElementById(`historia-fichaje-${f.id}`)
    if (!el) return false
    setOcupado(f.id)
    setError(null)
    try {
      downloadPng(await nodeToPng(el as HTMLElement, STORY_W, STORY_H), nombreFichero(f))
      setExportadas((prev) => {
        const s = new Set(prev); s.add(f.id); guardarExportadas(s); return s
      })
      return true
    } catch (e) {
      setError(`No se ha podido exportar la historia de ${f.atleta}: ${(e as Error).message}`)
      return false
    } finally {
      setOcupado(null)
    }
  }

  async function exportarPendientes() {
    for (const f of fichajes.filter((x) => !exportadas.has(x.id))) {
      const ok = await exportar(f)
      if (!ok) break
      await new Promise((r) => setTimeout(r, 350)) // el navegador encadena mejor las descargas
    }
  }

  return (
    <section className="mb-16">
      <div className="section-label mb-6">00 · mercado de fichajes · automático</div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="mr-auto max-w-xl text-sm leading-relaxed text-ink/55">
          Cada fichaje que se publica en el directo aparece aquí convertido en historia. La plantilla
          cambia según sea confirmado, rumor o con incógnita, y varía un poco entre fichajes.
          Los textos se pueden retocar antes de exportar.
        </p>
        <div className="inline-flex border border-ink/[0.15] bg-cream/60 p-1">
          {(['7d', 'todo'] as Rango[]).map((r) => (
            <button
              key={r} type="button" onClick={() => setRango(r)} aria-pressed={rango === r}
              className={`px-3 py-1.5 label-mono transition-colors ${rango === r ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'}`}
            >
              {r === '7d' ? 'Últimos 7 días' : 'Todos'}
            </button>
          ))}
        </div>
        {pendientes > 0 && (
          <button
            type="button" onClick={exportarPendientes} disabled={!!ocupado}
            className="bg-ink px-4 py-2.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40"
          >
            Exportar las {pendientes} nuevas
          </button>
        )}
      </div>

      {error && <p className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {estado === 'cargando' && <div className="h-40 animate-pulse border border-ink/[0.14] bg-cream/50" />}
      {estado === 'sin-tabla' && (
        <p className="border border-ink/[0.14] bg-cream/40 p-5 text-sm text-ink/65">
          La base de datos del mercado no está al día: ejecuta <code className="font-mono text-[0.8rem]">supabase/fichajes-schema.sql</code> en Supabase.
        </p>
      )}
      {estado === 'error' && (
        <p className="border border-ink/[0.14] bg-cream/40 p-5 text-sm text-ink/65">No se han podido cargar los fichajes.</p>
      )}
      {estado === 'listo' && fichajes.length === 0 && (
        <p className="border border-ink/[0.14] bg-cream/40 p-5 text-sm text-ink/65">
          {rango === '7d' ? 'No hay fichajes publicados en los últimos 7 días.' : 'Todavía no hay fichajes publicados.'}
        </p>
      )}

      {estado === 'listo' && fichajes.length > 0 && (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-10">
          {fichajes.map((f) => {
            const auto = plantillaAuto(f)
            const plantilla = forzadas[f.id] ?? auto
            const nueva = !exportadas.has(f.id)
            return (
              <div key={f.id} className="flex flex-col gap-2.5" style={{ width: CARD_W }}>
                <div className="relative shrink-0 overflow-hidden border border-ink/[0.14] bg-ink" style={{ width: CARD_W, height: CARD_H }}>
                  <div style={{ transform: `scale(${PREVIEW})`, transformOrigin: 'top left' }}>
                    {/* key: al cambiar de plantilla se vuelve a pintar entera */}
                    <FichajeCard key={plantilla} id={`historia-fichaje-${f.id}`} f={f} plantilla={plantilla} />
                  </div>
                  {nueva && (
                    <span className="absolute left-2 top-2 bg-mint px-1.5 py-0.5 label-mono text-[0.55rem] text-ink">nueva</span>
                  )}
                </div>
                <p className="truncate text-[0.8rem] font-semibold text-ink" title={f.atleta}>{f.atleta}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={forzadas[f.id] ?? ''}
                    onChange={(e) => setForzadas((p) => {
                      const n = { ...p }
                      if (e.target.value) n[f.id] = e.target.value as Plantilla
                      else delete n[f.id]
                      return n
                    })}
                    className="min-w-0 flex-1 border border-ink/[0.15] bg-cream/50 px-2 py-1.5 text-[0.78rem] text-ink focus:outline-none focus:ring-2 focus:ring-mint/40"
                    aria-label={`Plantilla de la historia de ${f.atleta}`}
                  >
                    <option value="">Auto · {PLANTILLA_NOMBRE[auto]}</option>
                    {(Object.keys(PLANTILLA_NOMBRE) as Plantilla[]).map((p) => (
                      <option key={p} value={p}>{PLANTILLA_NOMBRE[p]}</option>
                    ))}
                  </select>
                  <button
                    type="button" onClick={() => exportar(f)} disabled={ocupado === f.id}
                    className="shrink-0 bg-ink px-3 py-1.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40"
                  >
                    {ocupado === f.id ? '…' : 'PNG'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
