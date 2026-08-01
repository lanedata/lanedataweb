'use client'

// Estudio IG — editor de carruseles de Instagram con la identidad de lanedata.
// Compone diapositivas 1080×1350, genera el caption y exporta PNGs listos
// para subir. Todo ocurre en el navegador (la web es un export estático).

import { createClient } from '@/lib/supabase/client'
import { categoryLabel, slugify } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { slideToPng } from './exportSlide'
import { SLIDE_H, SLIDE_W, SlideCanvas } from './SlideCanvas'
import {
  newSlide,
  SLIDE_TYPE_LABELS,
  type ListaItem,
  type Slide,
  type SlideTheme,
  type SlideType,
} from './types'

const HASHTAGS =
  '#atletismo #atletismoespañol #rfea #trackandfield #running #lanedata'

const DRAFT_KEY = 'lanedata-estudio-draft'

const PREVIEW_SCALE = 0.34
const THUMB_SCALE = 0.075

interface ArticleOption {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  cover_image_url: string | null
  status: string
}

function defaultSlides(): Slide[] {
  return [newSlide('portada'), newSlide('dato'), newSlide('cierre')]
}

export function EstudioIG() {
  const [slides, setSlides] = useState<Slide[]>(defaultSlides)
  const [selected, setSelected] = useState(0)
  const [caption, setCaption] = useState('')
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')
  const [articles, setArticles] = useState<ArticleOption[] | null>(null)
  const [showArticles, setShowArticles] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const exportRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── Borrador en localStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (Array.isArray(draft.slides) && draft.slides.length > 0) {
          setSlides(draft.slides)
          setCaption(draft.caption ?? '')
        }
      }
    } catch { /* draft corrupto — se ignora */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ slides, caption }))
    } catch { /* sin espacio — no es crítico */ }
  }, [slides, caption, hydrated])

  const slide = slides[selected]

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3500)
  }

  // ── Operaciones sobre diapositivas ────────────────────────────────────────
  function update(patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s, i) => (i === selected ? { ...s, ...patch } : s)))
  }

  function add(type: SlideType) {
    setSlides((prev) => {
      const next = [...prev]
      // el cierre siempre al final; el resto, tras la seleccionada
      const at = type === 'cierre' ? next.length : selected + 1
      next.splice(at, 0, newSlide(type))
      setSelected(at)
      return next
    })
  }

  function remove(i: number) {
    if (slides.length === 1) return
    setSlides((prev) => prev.filter((_, j) => j !== i))
    setSelected((s) => Math.max(0, s > i ? s - 1 : Math.min(s, slides.length - 2)))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    setSlides((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setSelected(j)
  }

  function duplicate(i: number) {
    setSlides((prev) => {
      const next = [...prev]
      next.splice(i + 1, 0, { ...prev[i], id: newSlide(prev[i].type).id })
      return next
    })
    setSelected(i + 1)
  }

  function resetAll() {
    if (!window.confirm('¿Vaciar el carrusel y empezar de cero?')) return
    setSlides(defaultSlides())
    setCaption('')
    setSelected(0)
  }

  // ── Caption ───────────────────────────────────────────────────────────────
  function generateCaption() {
    const portada = slides.find((s) => s.type === 'portada')
    const datos = slides.filter((s) => s.type === 'dato' && s.stat)
    const cierre = slides.find((s) => s.type === 'cierre')
    const lines: string[] = []
    if (portada?.title) lines.push(portada.title)
    if (portada?.subtitle) lines.push('', portada.subtitle)
    if (datos.length > 0) {
      lines.push('')
      for (const d of datos) lines.push(`▸ ${d.stat}${d.statLabel ? ` — ${d.statLabel}` : ''}`)
    }
    lines.push('', `Análisis completo en ${cierre?.subtitle || 'lanedata.es'} (enlace en bio)`)
    lines.push('', HASHTAGS)
    setCaption(lines.join('\n'))
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption)
    flash('Caption copiado al portapapeles')
  }

  // ── Exportación PNG ───────────────────────────────────────────────────────
  function baseName() {
    const portada = slides.find((s) => s.type === 'portada')
    return slugify(portada?.title || 'carrusel') || 'carrusel'
  }

  async function renderSlide(i: number): Promise<string> {
    const node = exportRefs.current[i]?.firstElementChild as HTMLElement | null
    if (!node) throw new Error('Diapositiva no montada')
    return slideToPng(node)
  }

  function download(dataUrl: string, filename: string) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  async function exportOne(i: number) {
    setExporting(true)
    try {
      const url = await renderSlide(i)
      download(url, `${baseName()}-${String(i + 1).padStart(2, '0')}.png`)
      flash(`Diapositiva ${i + 1} descargada`)
    } catch (e) {
      flash(`Error al exportar: ${e instanceof Error ? e.message : e}`)
    }
    setExporting(false)
  }

  async function exportAll() {
    setExporting(true)
    try {
      for (let i = 0; i < slides.length; i++) {
        const url = await renderSlide(i)
        download(url, `${baseName()}-${String(i + 1).padStart(2, '0')}.png`)
        // pausa breve para que el navegador no bloquee descargas múltiples
        await new Promise((r) => setTimeout(r, 500))
      }
      flash(`${slides.length} diapositivas descargadas`)
    } catch (e) {
      flash(`Error al exportar: ${e instanceof Error ? e.message : e}`)
    }
    setExporting(false)
  }

  // ── Importar desde artículo ───────────────────────────────────────────────
  async function openArticles() {
    setShowArticles(true)
    if (articles) return
    const { data } = await createClient()
      .from('articles')
      .select('id, title, slug, excerpt, category, cover_image_url, status')
      .order('created_at', { ascending: false })
      .limit(30)
    setArticles(data ?? [])
  }

  function importArticle(a: ArticleOption) {
    const portada = newSlide('portada')
    portada.kicker = categoryLabel(a.category)
    portada.title = a.title
    portada.subtitle = a.excerpt ?? ''
    portada.imageUrl = a.cover_image_url ?? ''
    const dato = newSlide('dato')
    const cierre = newSlide('cierre')
    cierre.subtitle = `lanedata.es/articulo/${a.slug}`
    setSlides([portada, dato, cierre])
    setSelected(0)
    setCaption(
      `${a.title}\n\n${a.excerpt ?? ''}\n\nAnálisis completo en lanedata.es/articulo/${a.slug} (enlace en bio)\n\n${HASHTAGS}`
    )
    setShowArticles(false)
    flash('Carrusel creado desde el artículo — edítalo a tu gusto')
  }

  // ── Importar / exportar JSON (puente con generar_previa.py) ───────────────
  function openJson() {
    setJsonText(JSON.stringify(slides, null, 2))
    setShowJson(true)
  }

  function loadJson() {
    try {
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Se esperaba una lista de diapositivas')
      const loaded: Slide[] = parsed.map((raw: Partial<Slide>) => ({
        ...newSlide((raw.type as SlideType) || 'texto'),
        ...raw,
        id: newSlide('texto').id,
        items: Array.isArray(raw.items) ? raw.items : [],
      }))
      setSlides(loaded)
      setSelected(0)
      setShowJson(false)
      flash(`${loaded.length} diapositivas cargadas`)
    } catch (e) {
      flash(`JSON no válido: ${e instanceof Error ? e.message : e}`)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={openArticles} className={btnSecondary}>Desde un artículo</button>
        <button onClick={openJson} className={btnSecondary}>JSON</button>
        <button onClick={resetAll} className={btnSecondary}>Vaciar</button>
        <div className="ml-auto flex items-center gap-3">
          {notice && <span className="text-sm text-ink/60">{notice}</span>}
          <button onClick={() => exportOne(selected)} disabled={exporting} className={btnSecondary}>
            {exporting ? 'Exportando…' : 'Descargar esta'}
          </button>
          <button onClick={exportAll} disabled={exporting}
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-85 disabled:opacity-50">
            {exporting ? 'Exportando…' : `Descargar todas (${slides.length})`}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem,1fr,auto]">
        {/* Columna 1 — lista de diapositivas */}
        <div className="space-y-3">
          <p className="label-mono text-ink/40">Diapositivas</p>
          <div className="space-y-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                  i === selected ? 'border-ink bg-cream/60' : 'border-ink/[0.1] hover:border-ink/30'
                }`}
              >
                <div
                  className="shrink-0 overflow-hidden rounded-md border border-ink/[0.08]"
                  style={{ width: SLIDE_W * THUMB_SCALE, height: SLIDE_H * THUMB_SCALE }}
                >
                  <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left', width: SLIDE_W, height: SLIDE_H }}>
                    <SlideCanvas slide={s} index={i} total={slides.length} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="label-mono text-ink/50">{String(i + 1).padStart(2, '0')} · {SLIDE_TYPE_LABELS[s.type]}</p>
                  <p className="truncate text-xs text-ink/70">{s.title || s.stat || s.quote || '—'}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="label-mono pt-2 text-ink/40">Añadir</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SLIDE_TYPE_LABELS) as SlideType[]).map((t) => (
              <button key={t} onClick={() => add(t)}
                className="rounded-lg border border-ink/[0.12] px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:border-mint hover:bg-mint/10">
                + {SLIDE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Columna 2 — editor de la diapositiva seleccionada */}
        <div className="space-y-5 rounded-2xl border border-ink/[0.1] bg-cream/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-brand text-base font-bold text-ink">
              {String(selected + 1).padStart(2, '0')} · {SLIDE_TYPE_LABELS[slide.type]}
            </h2>
            <div className="flex items-center gap-2">
              <IconBtn onClick={() => move(selected, -1)} disabled={selected === 0} label="Subir">↑</IconBtn>
              <IconBtn onClick={() => move(selected, 1)} disabled={selected === slides.length - 1} label="Bajar">↓</IconBtn>
              <IconBtn onClick={() => duplicate(selected)} label="Duplicar">⧉</IconBtn>
              <IconBtn onClick={() => remove(selected)} disabled={slides.length === 1} label="Eliminar">✕</IconBtn>
            </div>
          </div>

          {/* Tema y tamaño */}
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="label-mono text-ink/40">Tema</span>
              {(['ink', 'paper', 'mint'] as SlideTheme[]).map((t) => (
                <button key={t} onClick={() => update({ theme: t })} aria-label={`Tema ${t}`}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${slide.theme === t ? 'scale-110 border-ink' : 'border-ink/20'}`}
                  style={{ background: t === 'ink' ? '#0D2A14' : t === 'paper' ? '#FBFAF6' : '#9FE88D' }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="label-mono text-ink/40">Tamaño</span>
              {(['S', 'M', 'L'] as const).map((s) => (
                <button key={s} onClick={() => update({ titleSize: s })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    slide.titleSize === s ? 'bg-ink text-cream' : 'border border-ink/[0.15] text-ink/60'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <SlideFields slide={slide} update={update} />
        </div>

        {/* Columna 3 — vista previa */}
        <div className="space-y-2">
          <p className="label-mono text-ink/40">Vista previa · 1080×1350</p>
          <div
            className="overflow-hidden rounded-xl border border-ink/[0.12] shadow-sm"
            style={{ width: SLIDE_W * PREVIEW_SCALE, height: SLIDE_H * PREVIEW_SCALE }}
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', width: SLIDE_W, height: SLIDE_H }}>
              <SlideCanvas slide={slide} index={selected} total={slides.length} />
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="rounded-2xl border border-ink/[0.1] bg-cream/30 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-brand text-base font-bold text-ink">Caption del post</h2>
          <div className="flex gap-2">
            <button onClick={generateCaption} className={btnSecondary}>Generar desde diapositivas</button>
            <button onClick={copyCaption} disabled={!caption} className={btnSecondary}>Copiar</button>
          </div>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={8}
          placeholder="Escribe el caption o pulsa «Generar desde diapositivas»…"
          className="w-full resize-y rounded-xl border border-ink/[0.15] bg-paper px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink/25 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40"
        />
      </div>

      {/* Render oculto a tamaño real para exportación */}
      <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
        {slides.map((s, i) => (
          <div key={s.id} ref={(el) => { exportRefs.current[i] = el }}>
            <SlideCanvas slide={s} index={i} total={slides.length} />
          </div>
        ))}
      </div>

      {/* Modal: elegir artículo */}
      {showArticles && (
        <Modal onClose={() => setShowArticles(false)} title="Crear carrusel desde un artículo">
          {!articles && <p className="py-8 text-center label-mono text-ink/30">Cargando…</p>}
          {articles && articles.length === 0 && (
            <p className="py-8 text-center text-sm text-ink/50">No hay artículos.</p>
          )}
          {articles && articles.length > 0 && (
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {articles.map((a) => (
                <button key={a.id} onClick={() => importArticle(a)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-ink/[0.08] px-4 py-3 text-left transition-colors hover:border-mint hover:bg-mint/5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                    <span className="label-mono text-ink/35">{categoryLabel(a.category)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 label-mono text-[0.6rem] ${
                    a.status === 'published' ? 'bg-mint/30 text-ink' : 'bg-ink/[0.08] text-ink/50'
                  }`}>
                    {a.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal: JSON */}
      {showJson && (
        <Modal onClose={() => setShowJson(false)} title="Diapositivas en JSON">
          <p className="mb-3 text-sm text-ink/55">
            Copia este JSON para guardarlo, o pega uno (por ejemplo el que genera{' '}
            <code className="rounded bg-ink/[0.07] px-1 py-0.5 font-mono text-xs">scripts/generar_previa.py</code>) y pulsa «Cargar».
          </p>
          <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={14} spellCheck={false}
            className="w-full resize-y rounded-xl border border-ink/[0.15] bg-paper px-4 py-3 font-mono text-xs leading-relaxed text-ink focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40" />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={async () => { await navigator.clipboard.writeText(jsonText); flash('JSON copiado') }} className={btnSecondary}>
              Copiar
            </button>
            <button onClick={loadJson}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-85">
              Cargar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Campos por tipo de diapositiva ──────────────────────────────────────────
function SlideFields({ slide, update }: { slide: Slide; update: (p: Partial<Slide>) => void }) {
  switch (slide.type) {
    case 'portada':
    case 'cierre':
      return (
        <div className="space-y-4">
          <F label="Etiqueta (kicker)"><input className={inputCls} value={slide.kicker} onChange={(e) => update({ kicker: e.target.value })} placeholder="Análisis / Crónica / El Dato…" /></F>
          <F label="Titular"><textarea className={inputCls} rows={3} value={slide.title} onChange={(e) => update({ title: e.target.value })} /></F>
          <F label="Subtítulo"><textarea className={inputCls} rows={2} value={slide.subtitle} onChange={(e) => update({ subtitle: e.target.value })} /></F>
          {slide.type === 'portada' && (
            <F label="Imagen de fondo (URL)" hint="Opcional. Usa la imagen de portada del artículo u otra URL pública.">
              <input className={inputCls} value={slide.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
            </F>
          )}
          {slide.type === 'cierre' && (
            <F label="Botón (texto)"><input className={inputCls} value={slide.body} onChange={(e) => update({ body: e.target.value })} placeholder="Enlace en bio" /></F>
          )}
        </div>
      )
    case 'dato':
      return (
        <div className="space-y-4">
          <F label="Etiqueta (kicker)"><input className={inputCls} value={slide.kicker} onChange={(e) => update({ kicker: e.target.value })} /></F>
          <F label="La cifra"><input className={inputCls + ' font-mono'} value={slide.stat} onChange={(e) => update({ stat: e.target.value })} placeholder="9.87 / +34% / 1:57.02" /></F>
          <F label="Qué mide"><input className={inputCls} value={slide.statLabel} onChange={(e) => update({ statLabel: e.target.value })} /></F>
          <F label="Contexto"><textarea className={inputCls} rows={3} value={slide.body} onChange={(e) => update({ body: e.target.value })} /></F>
        </div>
      )
    case 'lista':
      return (
        <div className="space-y-4">
          <F label="Etiqueta (kicker)"><input className={inputCls} value={slide.kicker} onChange={(e) => update({ kicker: e.target.value })} /></F>
          <F label="Título"><input className={inputCls} value={slide.title} onChange={(e) => update({ title: e.target.value })} /></F>
          <div className="space-y-2">
            <span className="label-mono text-ink/60">Filas</span>
            {slide.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls + ' w-14 text-center'} value={item.pos} placeholder="#"
                  onChange={(e) => updateItem(slide, update, i, { pos: e.target.value })} />
                <input className={inputCls + ' flex-1'} value={item.nombre} placeholder="Atleta / concepto"
                  onChange={(e) => updateItem(slide, update, i, { nombre: e.target.value })} />
                <input className={inputCls + ' w-32 font-mono'} value={item.valor} placeholder="Marca"
                  onChange={(e) => updateItem(slide, update, i, { valor: e.target.value })} />
                <button onClick={() => update({ items: slide.items.filter((_, j) => j !== i) })}
                  className="shrink-0 text-ink/30 transition-colors hover:text-ink" aria-label="Eliminar fila">✕</button>
              </div>
            ))}
            <button
              onClick={() => update({ items: [...slide.items, { pos: String(slide.items.length + 1), nombre: '', valor: '' }] })}
              className="rounded-lg border border-ink/[0.12] px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-mint hover:bg-mint/10">
              + Añadir fila
            </button>
          </div>
        </div>
      )
    case 'texto':
      return (
        <div className="space-y-4">
          <F label="Etiqueta (kicker)"><input className={inputCls} value={slide.kicker} onChange={(e) => update({ kicker: e.target.value })} /></F>
          <F label="Título"><input className={inputCls} value={slide.title} onChange={(e) => update({ title: e.target.value })} /></F>
          <F label="Texto"><textarea className={inputCls} rows={5} value={slide.body} onChange={(e) => update({ body: e.target.value })} /></F>
        </div>
      )
    case 'cita':
      return (
        <div className="space-y-4">
          <F label="Cita"><textarea className={inputCls} rows={3} value={slide.quote} onChange={(e) => update({ quote: e.target.value })} /></F>
          <F label="Autor / fuente"><input className={inputCls} value={slide.author} onChange={(e) => update({ author: e.target.value })} /></F>
        </div>
      )
  }
}

function updateItem(
  slide: Slide,
  update: (p: Partial<Slide>) => void,
  i: number,
  patch: Partial<ListaItem>
) {
  update({ items: slide.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
}

// ── UI auxiliar ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-ink/[0.15] bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 transition-colors'

const btnSecondary =
  'rounded-xl border border-ink/[0.15] px-4 py-2.5 text-sm text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50'

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block label-mono text-ink/60">{label}</label>
      {children}
      {hint && <p className="label-mono text-[0.625rem] text-ink/30">{hint}</p>}
    </div>
  )
}

function IconBtn({ onClick, disabled, label, children }: {
  onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/[0.12] text-sm text-ink/60 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-30">
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-brand text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-ink/40 transition-colors hover:text-ink" aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
