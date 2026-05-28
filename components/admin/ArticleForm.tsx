'use client'

import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Article, ArticleFormData } from '@/types'

const CATEGORIES = [
  'velocidad', 'medio-fondo', 'fondo', 'vallas', 'saltos',
  'lanzamientos', 'marcha', 'cross', 'pista-cubierta', 'historia', 'analisis', 'general',
]

interface Props {
  article?: Article
}

const empty: ArticleFormData = {
  title: '',
  slug: '',
  excerpt: '',
  html_content: '',
  html_url: '',
  cover_image_url: '',
  category: 'general',
  published_at: new Date().toISOString().slice(0, 16),
  status: 'draft',
}

// A full HTML document starts with <!DOCTYPE or <html
function isStandaloneHtml(content: string) {
  const s = content.trimStart().toLowerCase()
  return s.startsWith('<!doctype') || s.startsWith('<html')
}

export function ArticleForm({ article }: Props) {
  const router = useRouter()
  const isEdit = !!article
  const fileRef = useRef<HTMLInputElement>(null)
  const htmlFileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ArticleFormData>(
    article
      ? {
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? '',
          html_content: article.html_content,
          html_url: article.html_url ?? '',
          cover_image_url: article.cover_image_url ?? '',
          category: article.category ?? 'general',
          published_at: article.published_at
            ? new Date(article.published_at).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          status: article.status,
        }
      : { ...empty }
  )

  const [loadingHtml, setLoadingHtml] = useState(false)
  const [htmlFileName, setHtmlFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Detect if current content is already a standalone HTML file
  const hasStandaloneHtml = isStandaloneHtml(form.html_content)

  // Auto-generate slug from title (only when creating)
  useEffect(() => {
    if (!isEdit && form.title) {
      setForm((prev) => ({ ...prev, slug: slugify(form.title) }))
    }
  }, [form.title, isEdit])

  function set<K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    setSuccess('')
  }

  // ── Cover image upload ──────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return }

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `covers/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: false })

    if (uploadError) { setError(`Error al subir imagen: ${uploadError.message}`); setUploading(false); return }

    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    set('cover_image_url', data.publicUrl)
    setUploading(false)
  }

  // ── HTML file reader (no Storage — reads as text, stores in html_content) ──
  function handleHtmlFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Solo se permiten archivos .html')
      return
    }
    if (file.size > 10 * 1024 * 1024) { setError('El archivo HTML no puede superar los 10 MB.'); return }

    setLoadingHtml(true)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      set('html_content', content)
      setHtmlFileName(file.name)
      setLoadingHtml(false)
    }
    reader.onerror = () => {
      setError('Error al leer el archivo.')
      setLoadingHtml(false)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.title.trim()) { setError('El título es obligatorio.'); return }
    if (!form.slug.trim()) { setError('El slug es obligatorio.'); return }
    if (!form.html_content.trim()) { setError('El contenido HTML es obligatorio.'); return }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || null,
      html_content: form.html_content,
      html_url: null,                          // no longer used — content is in html_content
      cover_image_url: form.cover_image_url.trim() || null,
      category: form.category || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      status: form.status,
    }

    let opError
    if (isEdit) {
      const { error } = await supabase
        .from('articles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', article.id)
      opError = error
    } else {
      const { error } = await supabase.from('articles').insert(payload)
      opError = error
    }

    if (opError) {
      setError(opError.message.includes('unique')
        ? 'Este slug ya existe. Elige otro.'
        : `Error: ${opError.message}`)
      setSaving(false)
      return
    }

    setSuccess(
      isEdit
        ? 'Guardado. Pulsa "Publicar web" en la barra para que aparezca en lanedata.es.'
        : 'Artículo creado. Pulsa "Publicar web" en la barra para que aparezca en lanedata.es.'
    )
    setSaving(false)

    if (!isEdit) router.push('/admin')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Feedback */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* ─── Core fields ─── */}
      <section className="grid gap-6 rounded-2xl border border-ink/[0.1] bg-cream/30 p-6 sm:grid-cols-2">
        <h2 className="col-span-full label-mono text-ink/40">Información básica</h2>

        <div className="sm:col-span-2">
          <Field label="Título" required>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              required placeholder="Ej: Las marcas mínimas se disparan" className={inputCls} />
          </Field>
        </div>

        <div>
          <Field label="Slug (URL)" required hint="Solo letras, números y guiones">
            <input type="text" value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              required placeholder="marcas-minimas-mundiales" className={inputCls + ' font-mono text-xs'} />
          </Field>
        </div>

        <div>
          <Field label="Categoría">
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ')}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Descripción corta" hint="Se muestra en la portada y en el SEO (máx. 200 chars)">
            <textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)}
              rows={3} maxLength={200} placeholder="Resumen de una o dos frases…"
              className={inputCls + ' resize-none'} />
          </Field>
        </div>
      </section>

      {/* ─── Publishing ─── */}
      <section className="grid gap-6 rounded-2xl border border-ink/[0.1] bg-cream/30 p-6 sm:grid-cols-2">
        <h2 className="col-span-full label-mono text-ink/40">Publicación</h2>
        <div>
          <Field label="Estado">
            <select value={form.status} onChange={(e) => set('status', e.target.value as 'draft' | 'published')} className={inputCls}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </Field>
        </div>
        <div>
          <Field label="Fecha de publicación">
            <input type="datetime-local" value={form.published_at}
              onChange={(e) => set('published_at', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* ─── Cover image ─── */}
      <section className="rounded-2xl border border-ink/[0.1] bg-cream/30 p-6 space-y-4">
        <h2 className="label-mono text-ink/40">Imagen de portada</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="URL directa">
              <input type="url" value={form.cover_image_url}
                onChange={(e) => set('cover_image_url', e.target.value)}
                placeholder="https://…" className={inputCls} />
            </Field>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label-mono text-ink/40">O sube un archivo</span>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded-xl border border-ink/[0.15] px-4 py-2.5 text-sm text-ink/70 hover:border-ink/30 hover:text-ink transition-colors disabled:opacity-50">
              {uploading ? 'Subiendo…' : 'Elegir imagen'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload} className="hidden" />
          </div>
        </div>
        {form.cover_image_url && (
          <div className="relative w-40 overflow-hidden rounded-xl border border-ink/[0.1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.cover_image_url} alt="Vista previa" className="aspect-[16/9] w-full object-cover" />
            <button type="button" onClick={() => set('cover_image_url', '')}
              className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-0.5 text-cream/80 hover:bg-ink" aria-label="Quitar imagen">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </section>

      {/* ─── HTML CONTENT ─── */}
      <section className="rounded-2xl border border-ink/[0.1] bg-cream/30 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-brand text-base font-bold text-ink">Contenido HTML *</h2>
            <p className="mt-1 text-sm text-ink/55">
              Pega HTML de fragmento <em>o</em> sube tu archivo HTML completo (con sus estilos y gráficos).
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button type="button" onClick={() => htmlFileRef.current?.click()} disabled={loadingHtml}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:opacity-85 transition-opacity disabled:opacity-50 whitespace-nowrap">
              {loadingHtml ? 'Leyendo…' : hasStandaloneHtml ? 'Reemplazar HTML' : 'Subir archivo .html'}
            </button>
            <input ref={htmlFileRef} type="file" accept=".html,.htm"
              onChange={handleHtmlFileSelect} className="hidden" />
          </div>
        </div>

        {/* Show file indicator if a standalone HTML is loaded */}
        {hasStandaloneHtml && (
          <div className="flex items-center gap-3 rounded-xl border border-mint/40 bg-mint/10 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink">
              <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">
                HTML completo cargado{htmlFileName ? ` — ${htmlFileName}` : ''}
              </p>
              <p className="text-xs text-ink/50">
                Se mostrará en pantalla completa. {(form.html_content.length / 1024).toFixed(0)} KB
              </p>
            </div>
            <button type="button" onClick={() => { set('html_content', ''); setHtmlFileName('') }}
              className="text-ink/40 hover:text-ink transition-colors shrink-0" aria-label="Eliminar HTML">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Show textarea only when NOT a standalone HTML */}
        {!hasStandaloneHtml && (
          <>
            <textarea value={form.html_content} onChange={(e) => set('html_content', e.target.value)}
              rows={18} placeholder={`<h2>Introducción</h2>\n<p>Pega aquí el HTML del artículo (sin <html>, <head> ni <body>).</p>`}
              className="w-full rounded-xl border border-ink/[0.15] bg-paper px-4 py-3 font-mono text-xs leading-relaxed text-ink placeholder:text-ink/25 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 resize-y transition-colors"
              spellCheck={false} />
            <p className="label-mono text-ink/25 text-[0.625rem] text-right">
              {form.html_content.length.toLocaleString('es')} chars
            </p>
          </>
        )}
      </section>

      {/* ─── Actions ─── */}
      <div className="flex flex-wrap items-center gap-4 border-t border-ink/[0.1] pt-6">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-85 disabled:opacity-50">
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        <button type="button" onClick={() => router.push('/admin')}
          className="rounded-xl border border-ink/[0.15] px-6 py-3 text-sm text-ink/60 transition-colors hover:border-ink/30 hover:text-ink">
          Cancelar
        </button>
        {isEdit && (
          <a href={`https://lanedata.es/articulo/${article.slug}/`} target="_blank" rel="noopener noreferrer"
            className="ml-auto label-mono text-ink/35 hover:text-ink/60 transition-colors"
            title="Solo disponible tras reconstruir el sitio">
            Ver en lanedata.es →
          </a>
        )}
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-xl border border-ink/[0.15] bg-paper/70 px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-paper focus:outline-none focus:ring-2 focus:ring-mint/40 transition-colors'

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block label-mono text-ink/60">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="label-mono text-ink/30 text-[0.625rem]">{hint}</p>}
    </div>
  )
}
