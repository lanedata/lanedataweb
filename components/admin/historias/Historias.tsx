'use client'

import { useCallback, useRef, useState } from 'react'
import { downloadPng, nodeToPng } from '../exportNode'
import { CoverCard, FeatCard, MinimaCard, RecordsCard, Top5Card } from './StoryCards'
import { parseCsv, toCsv } from './csv'
import { DEFAULT_DATA } from './data'
import { STORY_H, STORY_W, minimaCards } from './types'
import type { Photo, StoryData } from './types'

/** Escala de la previsualización. El arrastre divide por ella para convertir
 *  píxeles de pantalla en píxeles de tarjeta. */
const PREVIEW = 0.3
const CARD_W = Math.round(STORY_W * PREVIEW)
const CARD_H = Math.round(STORY_H * PREVIEW)

interface DragState {
  id: string
  pointerId: number
  sx: number
  sy: number
  ox: number
  oy: number
}

export function Historias() {
  const [data, setData] = useState<StoryData>(DEFAULT_DATA)
  const [status, setStatus] = useState('Sin CSV cargado · se muestran los datos de ejemplo')
  const [framing, setFraming] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Fuerza a React a recrear las tarjetas al cargar un CSV, descartando las
  // ediciones a mano de la tanda anterior.
  const [nonce, setNonce] = useState(0)
  // Redibuja los controles (zoom) sin tocar el DOM de la tarjeta.
  const [, forceTick] = useState(0)

  const photos = useRef<Record<string, Photo>>({})
  const imgEls = useRef<Record<string, HTMLImageElement | null>>({})
  const phEls = useRef<Record<string, HTMLDivElement | null>>({})
  const drag = useRef<DragState | null>(null)

  // Semilla del encuadre para cada destacado del CSV actual. Se llama al pintar
  // porque los controles de zoom leen photos.current en el mismo render.
  function seedPhotos() {
    for (const f of data.feats) {
      if (!photos.current[f.id]) {
        photos.current[f.id] = { src: f.foto ?? null, x: 0, y: 0, z: 1 }
      }
    }
  }
  seedPhotos()

  /** Vuelca el encuadre al DOM sin pasar por React. */
  const apply = useCallback((id: string) => {
    const p = photos.current[id]
    const img = imgEls.current[id]
    const ph = phEls.current[id]
    if (!p) return
    if (img) {
      if (p.src) {
        if (img.getAttribute('src') !== p.src) img.src = p.src
        img.style.display = 'block'
      } else {
        img.style.display = 'none'
      }
      img.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.z})`
    }
    if (ph) ph.style.display = p.src ? 'none' : 'block'
  }, [])

  // ── Arrastre ───────────────────────────────────────────────────────────────
  // Con Pointer Events + setPointerCapture: un solo camino para ratón, dedo y
  // lápiz, y el gesto sigue vivo aunque el puntero salga de la tarjeta.
  const onPointerDown = useCallback((id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    const p = photos.current[id]
    if (!p?.src) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
    e.currentTarget.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== id || d.pointerId !== e.pointerId) return
    const p = photos.current[id]
    if (!p) return
    p.x = d.ox + (e.clientX - d.sx) / PREVIEW
    p.y = d.oy + (e.clientY - d.sy) / PREVIEW
    apply(id)
    e.preventDefault()
  }, [apply])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    }
    drag.current = null
    e.currentTarget.style.cursor = 'grab'
  }, [])

  // ── Foto ───────────────────────────────────────────────────────────────────
  function onUpload(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => {
      photos.current[id] = { src: String(rd.result), x: 0, y: 0, z: 1 }
      apply(id)
      forceTick((n) => n + 1)
    }
    rd.readAsDataURL(file)
    e.target.value = ''
  }

  function onZoom(id: string, z: number) {
    const p = photos.current[id]
    if (!p) return
    p.z = z
    apply(id)
    forceTick((n) => n + 1)
  }

  function onResetFrame(id: string) {
    const p = photos.current[id]
    if (!p) return
    p.x = 0; p.y = 0; p.z = 1
    apply(id)
    forceTick((n) => n + 1)
  }

  // ── CSV ────────────────────────────────────────────────────────────────────
  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const d = parseCsv(String(rd.result))
        imgEls.current = {}
        phEls.current = {}
        photos.current = {}
        setData(d)
        setNonce((n) => n + 1)
        setStatus(
          `CSV cargado · ${d.feats.length} destacados, ${d.records.length} récords, ` +
          `${d.top5.length} top, ${d.minima.length} mínimas`
        )
        setError(null)
      } catch (err) {
        setError(`No se pudo leer el CSV: ${(err as Error).message}`)
      }
    }
    rd.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function downloadTemplate() {
    const blob = new Blob(['﻿' + toCsv(data)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plantilla-historias.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  // ── Exportación ────────────────────────────────────────────────────────────
  const exportCard = useCallback(async (id: string, name: string) => {
    const el = document.getElementById(`card-${id}`)
    if (!el) return
    setBusy(id)
    setError(null)
    try {
      downloadPng(await nodeToPng(el as HTMLElement, STORY_W, STORY_H), name)
    } catch (err) {
      setError(`Error exportando ${name}: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }, [])

  const mCards = minimaCards(data.minima)

  async function exportAll() {
    const list: [string, string][] = [
      ['cover', '01-portada'],
      ['records', '02-records'],
      ['top5', '03-top5'],
    ]
    mCards.forEach((c, i) => list.push([c.id, `${String(4 + i).padStart(2, '0')}-minima-${i + 1}`]))
    data.feats.forEach((f, i) =>
      list.push([f.id, `${String(4 + mCards.length + i).padStart(2, '0')}-${f.id}`])
    )
    for (const [id, name] of list) {
      await exportCard(id, name)
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  return (
    <div>
      {/* Barra de control */}
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-ink/[0.14] pb-5">
        <label className="inline-flex cursor-pointer items-center border border-ink/[0.14] px-4 py-2.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
          Cargar CSV
          <input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
        </label>
        <button
          onClick={downloadTemplate}
          className="border border-ink/[0.14] px-4 py-2.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink"
        >
          Descargar plantilla
        </button>
        <button
          onClick={exportAll}
          disabled={busy !== null}
          className="bg-ink px-4 py-2.5 label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40"
        >
          {busy ? 'Exportando…' : 'Exportar todas'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="label-mono text-ink/40">Modo</span>
          <div className="inline-flex border border-ink/[0.14]">
            <button
              onClick={() => setFraming(true)}
              className={`px-3 py-2 label-mono transition-colors ${framing ? 'bg-ink text-mint' : 'text-ink/50 hover:text-ink'}`}
            >
              Encuadrar foto
            </button>
            <button
              onClick={() => setFraming(false)}
              className={`px-3 py-2 label-mono transition-colors ${!framing ? 'bg-ink text-mint' : 'text-ink/50 hover:text-ink'}`}
            >
              Editar texto
            </button>
          </div>
        </div>
      </div>

      <p className="mb-2 label-mono text-ink/45">{status}</p>
      <p className="mb-8 max-w-3xl text-sm text-ink/55 leading-relaxed">
        El CSV admite <b className="text-ink/75">;</b> o <b className="text-ink/75">,</b> como separador. La columna{' '}
        <b className="text-ink/75">tipo</b> decide la historia: GLOBAL, PORTADA, SECCION, RECORD, TOP5, MINIMA y
        DESTACADO. En <b className="text-ink/75">Editar texto</b> puedes cambiar cualquier texto haciendo clic encima;
        en <b className="text-ink/75">Encuadrar foto</b> arrastras la imagen y ajustas el zoom sin perder esas ediciones.
      </p>

      {error && (
        <p className="mb-8 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <Section n="01" title="Portada">
        <CardFrame>
          <CoverCard id="card-cover" cover={data.cover} />
        </CardFrame>
        <ExportButton busy={busy === 'cover'} onClick={() => exportCard('cover', '01-portada')} />
      </Section>

      <Section n="02" title="Récords">
        <CardFrame>
          <RecordsCard id="card-records" fecha={data.fecha} head={data.secRecords} rows={data.records} />
        </CardFrame>
        <ExportButton busy={busy === 'records'} onClick={() => exportCard('records', '02-records')} />
      </Section>

      <Section n="03" title="Top 5">
        <CardFrame>
          <Top5Card id="card-top5" fecha={data.fecha} head={data.secTop5} rows={data.top5} />
        </CardFrame>
        <ExportButton busy={busy === 'top5'} onClick={() => exportCard('top5', '03-top5')} />
      </Section>

      <Section n="04" title="Mínimas">
        {mCards.map((c, i) => (
          <div key={`${nonce}-${c.id}`} className="flex items-start gap-4">
            <CardFrame>
              <MinimaCard id={`card-${c.id}`} fecha={data.fecha} head={data.secMinima} idx={c.idx} rows={c.rows} />
            </CardFrame>
            <ExportButton
              busy={busy === c.id}
              onClick={() => exportCard(c.id, `${String(4 + i).padStart(2, '0')}-minima-${i + 1}`)}
            />
          </div>
        ))}
      </Section>

      <Section n="05" title={`Destacados · ${data.feats.length}`}>
        {data.feats.map((f, i) => {
          const p = photos.current[f.id]
          return (
            <div key={`${nonce}-${f.id}`} className="w-[324px]">
              <CardFrame>
                <FeatCard
                  id={`card-${f.id}`}
                  fecha={data.fecha}
                  feat={f}
                  framing={framing}
                  imgRef={(el) => { imgEls.current[f.id] = el; if (el) apply(f.id) }}
                  placeholderRef={(el) => { phEls.current[f.id] = el; if (el) apply(f.id) }}
                  onPointerDown={onPointerDown(f.id)}
                  onPointerMove={onPointerMove(f.id)}
                  onPointerUp={onPointerUp}
                />
              </CardFrame>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center border border-ink/[0.14] px-3 py-1.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink">
                  Subir foto
                  <input type="file" accept="image/*" onChange={(e) => onUpload(f.id, e)} className="hidden" />
                </label>
                <button
                  onClick={() => onResetFrame(f.id)}
                  className="border border-ink/[0.14] px-3 py-1.5 label-mono text-ink/60 transition-colors hover:bg-ink hover:text-mint hover:border-ink"
                >
                  Reset
                </button>
                <ExportButton
                  small
                  busy={busy === f.id}
                  onClick={() => exportCard(f.id, `${String(4 + mCards.length + i).padStart(2, '0')}-${f.id}`)}
                />
              </div>

              <label className="mt-2 flex items-center gap-2">
                <span className="label-mono text-ink/40">Zoom</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.01}
                  value={p?.z ?? 1}
                  disabled={!p?.src}
                  onChange={(e) => onZoom(f.id, parseFloat(e.target.value))}
                  className="flex-1 accent-ink disabled:opacity-30"
                />
                <span className="label-mono tabular-nums text-ink/40">{(p?.z ?? 1).toFixed(2)}×</span>
              </label>
            </div>
          )
        })}
      </Section>
    </div>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="section-label mb-6">{n} · {title}</div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-10">{children}</div>
    </section>
  )
}

/** Recorta y escala la tarjeta 1080×1920 al tamaño de previsualización. */
function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shrink-0 overflow-hidden border border-ink/[0.14] bg-ink"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div style={{ transform: `scale(${PREVIEW})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

function ExportButton({ onClick, busy, small }: { onClick: () => void; busy: boolean; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`bg-ink label-mono text-mint transition-colors hover:bg-mint hover:text-ink disabled:opacity-40 ${
        small ? 'px-3 py-1.5' : 'px-4 py-2.5'
      }`}
    >
      {busy ? 'Exportando…' : 'Exportar PNG'}
    </button>
  )
}
