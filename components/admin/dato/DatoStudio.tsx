'use client'

// Estudio de "El dato de la semana": carga el CSV semanal, elige la semana
// (por defecto la que tocaría hoy), permite forzar la variante visual, subir y
// encuadrar una foto opcional, retocar los textos y exportar la story en PNG.

import { useCallback, useMemo, useRef, useState } from 'react'
import { downloadPng, nodeToPng } from '../exportNode'
import { DatoCard } from '@/components/datosemana/DatoStoryCards'
import { parseCsv, pickActive } from '@/lib/datosemana/csv'
import { STORY_H, STORY_W, VARIANT_COUNT, resolveVariant } from '@/lib/datosemana/types'
import type { DatoSemana } from '@/lib/datosemana/types'

const CSV_URL = '/dato-semana.csv'
const PREVIEW = 0.3
const CARD_W = Math.round(STORY_W * PREVIEW)
const CARD_H = Math.round(STORY_H * PREVIEW)
const DRAG_THRESHOLD = 4

const VARIANT_NAMES: Record<number, string> = {
  1: 'Aniversario', 2: 'Número gigante', 3: 'Editorial claro', 4: 'Foto',
}

interface Photo { src: string | null; x: number; y: number; z: number }

const EMPTY_DATO: DatoSemana = {
  desde: '', kicker: 'El dato de la semana',
  titular: 'Escribe aquí el dato de la semana',
  fuente: 'mundo atletismo', variante: 'auto',
}

type CaretDoc = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
}
function caretFromPoint(x: number, y: number): Range | null {
  const doc = document as CaretDoc
  if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y)
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y)
    if (pos) { const r = document.createRange(); r.setStart(pos.offsetNode, pos.offset); r.setEnd(pos.offsetNode, pos.offset); return r }
  }
  return null
}

export function DatoStudio() {
  const [datos, setDatos] = useState<DatoSemana[]>([])
  const [index, setIndex] = useState<number>(-1)
  const [dato, setDato] = useState<DatoSemana>(EMPTY_DATO)
  const [variantSel, setVariantSel] = useState<'auto' | number>('auto')
  const [status, setStatus] = useState('Sin CSV cargado · edita los campos y exporta')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [, forceTick] = useState(0)

  const photo = useRef<Photo>({ src: null, x: 0, y: 0, z: 1 })
  const imgEl = useRef<HTMLImageElement | null>(null)
  const phEl = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ pointerId: number; sx: number; sy: number; ox: number; oy: number; dragged: boolean; hasPhoto: boolean } | null>(null)

  const variant = useMemo(
    () => (variantSel === 'auto' ? resolveVariant(dato) : variantSel),
    [variantSel, dato],
  )

  const apply = useCallback(() => {
    const p = photo.current
    const img = imgEl.current
    const ph = phEl.current
    if (img) {
      if (p.src) {
        if (img.getAttribute('src') !== p.src) img.src = p.src
        img.style.display = 'block'
      } else img.style.display = 'none'
      img.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.z})`
    }
    if (ph) ph.style.display = p.src ? 'none' : 'block'
  }, [])

  // ── Arrastre de la foto ─────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = photo.current
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, dragged: false, hasPhoto: !!p.src }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const dr = drag.current
    if (!dr || dr.pointerId !== e.pointerId) return
    const dx = e.clientX - dr.sx
    const dy = e.clientY - dr.sy
    if (!dr.dragged) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      dr.dragged = true
      if (dr.hasPhoto) e.currentTarget.style.cursor = 'grabbing'
    }
    if (!dr.hasPhoto) return
    const p = photo.current
    p.x = dr.ox + dx / PREVIEW
    p.y = dr.oy + dy / PREVIEW
    apply()
    e.preventDefault()
  }, [apply])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const dr = drag.current
    if (!dr || dr.pointerId !== e.pointerId) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    e.currentTarget.style.cursor = ''
    if (!dr.dragged) {
      const layer = e.currentTarget
      const prev = layer.style.pointerEvents
      layer.style.pointerEvents = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      layer.style.pointerEvents = prev
      if (el?.isContentEditable) {
        el.focus()
        const range = caretFromPoint(e.clientX, e.clientY)
        if (range) { const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range) }
      }
    }
    drag.current = null
  }, [])

  // ── Foto ────────────────────────────────────────────────────────────────────
  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => { photo.current = { src: String(rd.result), x: 0, y: 0, z: 1 }; apply(); forceTick((n) => n + 1) }
    rd.readAsDataURL(file)
    e.target.value = ''
  }
  function onZoom(z: number) { photo.current.z = z; apply(); forceTick((n) => n + 1) }
  function onResetFrame() { photo.current = { ...photo.current, x: 0, y: 0, z: 1 }; apply(); forceTick((n) => n + 1) }

  // ── CSV ─────────────────────────────────────────────────────────────────────
  function loadDatos(list: DatoSemana[], msg: string) {
    if (!list.length) { setError('El CSV no tiene ninguna fila con titular'); return }
    const active = pickActive(list) ?? list[0]
    const i = list.indexOf(active)
    setDatos(list)
    selectIndex(list, i < 0 ? 0 : i)
    setStatus(msg)
    setError(null)
  }

  function selectIndex(list: DatoSemana[], i: number) {
    const d = list[i] ?? EMPTY_DATO
    setIndex(i)
    setDato({ ...d })
    if (d.foto) photo.current = { src: d.foto, x: 0, y: 0, z: 1 }
    else photo.current = { src: null, x: 0, y: 0, z: 1 }
    imgEl.current = null
    phEl.current = null
    setVariantSel('auto')
    setNonce((n) => n + 1)
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => {
      try { loadDatos(parseCsv(String(rd.result)), `CSV cargado · ${parseCsv(String(rd.result)).length} semanas`) }
      catch (err) { setError(`No se pudo leer el CSV: ${(err as Error).message}`) }
    }
    rd.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function loadFromWeb() {
    try {
      const r = await fetch(CSV_URL, { cache: 'no-store' })
      if (!r.ok) throw new Error(String(r.status))
      loadDatos(parseCsv(await r.text()), 'CSV del sitio cargado')
    } catch (err) { setError(`No se pudo cargar ${CSV_URL}: ${(err as Error).message}`) }
  }

  // ── Edición de campos ────────────────────────────────────────────────────────
  function set<K extends keyof DatoSemana>(k: K, v: DatoSemana[K]) {
    setDato((d) => ({ ...d, [k]: v }))
    setNonce((n) => n + 1)
  }

  // ── Exportación ──────────────────────────────────────────────────────────────
  const exportCard = useCallback(async () => {
    const el = document.getElementById('card-dato')
    if (!el) return
    setBusy(true); setError(null)
    try {
      const name = dato.desde ? `dato-${dato.desde}` : 'dato-semana'
      downloadPng(await nodeToPng(el as HTMLElement, STORY_W, STORY_H), name)
    } catch (err) { setError(`Error exportando: ${(err as Error).message}`) }
    finally { setBusy(false) }
  }, [dato.desde])

  return (
    <div>
      {/* Barra de control */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-ink/[0.14] pb-5">
        <label className="inline-flex cursor-pointer items-center border border-ink/[0.14] px-4 py-2.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
          Cargar CSV
          <input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
        </label>
        <button onClick={loadFromWeb} className="border border-ink/[0.14] px-4 py-2.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
          Cargar CSV del sitio
        </button>
        <button onClick={exportCard} disabled={busy} className="bg-ink px-4 py-2.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40">
          {busy ? 'Exportando…' : 'Exportar PNG'}
        </button>
      </div>

      <p className="mb-2 label-mono text-ink/45">{status}</p>
      {error && <p className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* Panel de edición */}
        <div className="w-full max-w-md space-y-4">
          {datos.length > 0 && (
            <Field label="Semana">
              <select
                value={index}
                onChange={(e) => selectIndex(datos, Number(e.target.value))}
                className="w-full border border-ink/[0.15] bg-cream/60 px-3 py-2.5 text-sm text-ink focus:border-ink/30 focus:outline-none"
              >
                {datos.map((d, i) => (
                  <option key={i} value={i}>
                    {d.desde || '—'} · {truncate(d.titular, 46)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Variante visual">
            <div className="flex flex-wrap gap-2">
              <VariantChip active={variantSel === 'auto'} onClick={() => { setVariantSel('auto'); setNonce((n) => n + 1) }}>
                Auto ({VARIANT_NAMES[resolveVariant(dato)]})
              </VariantChip>
              {Array.from({ length: VARIANT_COUNT }, (_, i) => i + 1).map((n) => (
                <VariantChip key={n} active={variantSel === n} onClick={() => { setVariantSel(n); setNonce((x) => x + 1) }}>
                  {n} · {VARIANT_NAMES[n]}
                </VariantChip>
              ))}
            </div>
          </Field>

          <Field label="Kicker"><Input value={dato.kicker} onChange={(v) => set('kicker', v)} /></Field>
          <Field label="Titular (el dato)"><Textarea value={dato.titular} onChange={(v) => set('titular', v)} /></Field>
          <Field label="Contexto"><Textarea value={dato.contexto ?? ''} onChange={(v) => set('contexto', v || undefined)} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Destacado"><Input value={dato.destacado ?? ''} onChange={(v) => set('destacado', v || undefined)} placeholder="2.02m / 18 / 5" /></Field>
            <Field label="Etiqueta destacado"><Input value={dato.destacadoLabel ?? ''} onChange={(v) => set('destacadoLabel', v || undefined)} placeholder="AÑOS SIN BATIRSE" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Año"><Input value={dato.anio ?? ''} onChange={(v) => set('anio', v || undefined)} placeholder="2012" /></Field>
            <Field label="Categoría"><Input value={dato.categoria ?? ''} onChange={(v) => set('categoria', v || undefined)} placeholder="SALTO DE ALTURA" /></Field>
          </div>
          <Field label="Fecha histórica"><Input value={dato.fechaHistorica ?? ''} onChange={(v) => set('fechaHistorica', v || undefined)} placeholder="12 AGO 2012 / UN DÍA COMO HOY" /></Field>

          {/* Foto */}
          <Field label="Foto (opcional)">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center border border-ink/[0.14] px-3 py-1.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
                Subir foto
                <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
              </label>
              <button onClick={onResetFrame} className="border border-ink/[0.14] px-3 py-1.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
                Reset
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2">
              <span className="label-mono text-ink/40">Zoom</span>
              <input
                type="range" min={0.5} max={3} step={0.01}
                value={photo.current.z}
                disabled={!photo.current.src}
                onChange={(e) => onZoom(parseFloat(e.target.value))}
                className="flex-1 accent-ink disabled:opacity-30"
              />
              <span className="label-mono tabular-nums text-ink/40">{photo.current.z.toFixed(2)}×</span>
            </label>
            <p className="mt-1 label-mono text-ink/35">La foto sólo se ve en las variantes 1 y 4. Arrástrala sobre la tarjeta para encuadrar.</p>
          </Field>
        </div>

        {/* Previsualización */}
        <div className="shrink-0">
          <div className="overflow-hidden border border-ink/[0.14] bg-ink" style={{ width: CARD_W, height: CARD_H }}>
            <div style={{ transform: `scale(${PREVIEW})`, transformOrigin: 'top left' }}>
              <DatoCard
                key={nonce}
                id="card-dato"
                dato={dato}
                variant={variant}
                imgRef={(el) => { imgEl.current = el; if (el) apply() }}
                placeholderRef={(el) => { phEl.current = el; if (el) apply() }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
          </div>
          <p className="mt-3 max-w-[324px] label-mono text-ink/40">
            Haz clic en cualquier texto de la tarjeta para retocarlo antes de exportar.
          </p>
        </div>
      </div>
    </div>
  )
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block label-mono text-ink/60">{label}</span>
      {children}
    </label>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-ink/[0.15] bg-cream/60 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-cream focus:outline-none"
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-y border border-ink/[0.15] bg-cream/60 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-cream focus:outline-none"
    />
  )
}

function VariantChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border px-3 py-1.5 label-mono transition-colors ${
        active ? 'border-ink bg-ink text-mint' : 'border-ink/[0.14] text-ink/60 hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  )
}
