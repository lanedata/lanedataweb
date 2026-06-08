'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Competition, ArticlePreview } from '@/types'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}

function formatFecha(inicio: string, fin: string | null): string {
  const d1 = new Date(inicio + 'T12:00:00')
  if (!fin || fin === inicio) return `${d1.getDate()} ${MESES[d1.getMonth()].slice(0,3)}`
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) return `${d1.getDate()}–${d2.getDate()} ${MESES[d1.getMonth()].slice(0,3)}`
  return `${d1.getDate()} ${MESES[d1.getMonth()].slice(0,3)} – ${d2.getDate()} ${MESES[d2.getMonth()].slice(0,3)}`
}

// ─── Spinner + Check ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-ink/40" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}
function CheckMark() {
  return (
    <svg className="w-4 h-4 text-mint" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors border-b-2 ${
        active
          ? 'border-ink text-ink'
          : 'border-transparent text-ink/40 hover:text-ink/70'
      }`}
    >
      {children}
    </button>
  )
}

// ─── TAB 1: Competitions → link article ───────────────────────────────────────
function CompetitionsTab({
  competitions,
  articles,
  saving,
  saved,
  onLink,
  mesActivo,
  setMesActivo,
  search,
  setSearch,
  mesesConDatos,
}: {
  competitions: Competition[]
  articles: ArticlePreview[]
  saving: string | null
  saved: string | null
  onLink: (compId: string, artId: string | null) => void
  mesActivo: number | null
  setMesActivo: (m: number | null) => void
  search: string
  setSearch: (s: string) => void
  mesesConDatos: number[]
}) {
  const filtered = useMemo(() => {
    let list = competitions
    if (mesActivo !== null) list = list.filter(c => getMes(c.fecha_inicio) === mesActivo)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        (c.ciudad?.toLowerCase().includes(q) ?? false) ||
        (c.disciplina?.toLowerCase().includes(q) ?? false)
      )
    }
    return list
  }, [competitions, mesActivo, search])

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Buscar competición, ciudad…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-ink/[0.15] bg-cream/60 px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-mint/40"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMesActivo(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors ${mesActivo === null ? 'bg-ink text-cream' : 'border border-ink/20 text-ink/60 hover:text-ink'}`}
          >
            Todos
          </button>
          {mesesConDatos.map(m => (
            <button
              key={m}
              onClick={() => setMesActivo(m === mesActivo ? null : m)}
              className={`rounded-full px-3 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors ${mesActivo === m ? 'bg-mint text-ink' : 'border border-ink/20 text-ink/60 hover:text-ink'}`}
            >
              {MESES[m].slice(0,3)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ink/[0.1] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[7rem_1fr_2fr] bg-ink text-cream px-4 py-2.5 gap-4">
          <span className="font-mono text-[0.6rem] tracking-widest uppercase opacity-60">Fecha</span>
          <span className="font-mono text-[0.6rem] tracking-widest uppercase opacity-60">Competición</span>
          <span className="font-mono text-[0.6rem] tracking-widest uppercase opacity-60">Vincular artículo</span>
        </div>

        <div className="divide-y divide-ink/[0.07]">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink/40 font-mono">
              {search ? `Sin resultados para &ldquo;${search}&rdquo;` : 'Sin competiciones'}
            </div>
          )}
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`flex flex-col sm:grid sm:grid-cols-[7rem_1fr_2fr] gap-2 sm:gap-4 px-4 py-3 items-start sm:items-center ${i % 2 === 0 ? 'bg-paper' : 'bg-cream/30'}`}
            >
              <div>
                <span className="font-mono text-[0.68rem] tracking-wider text-ink/50 uppercase">
                  {formatFecha(c.fecha_inicio, c.fecha_fin)}
                </span>
                {c.disciplina && (
                  <div className="font-mono text-[0.6rem] tracking-wider text-ink/35 uppercase mt-0.5">{c.disciplina}</div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink leading-snug">{c.nombre}</p>
                {c.ciudad && (
                  <p className="font-mono text-[0.62rem] tracking-wider text-ink/40 uppercase mt-0.5">
                    {c.ciudad}{c.area ? ` · ${c.area}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 w-full">
                <select
                  value={c.article_id ?? ''}
                  onChange={e => onLink(c.id, e.target.value || null)}
                  disabled={saving === c.id}
                  className="flex-1 rounded-lg border border-ink/[0.15] bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-50"
                >
                  <option value="">— Sin artículo —</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <div className="w-6 shrink-0">
                  {saving === c.id && <Spinner />}
                  {saved === c.id && <CheckMark />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── TAB 2: Articles → link competition ───────────────────────────────────────
function ArticlesTab({
  articles,
  competitions,
  saving,
  saved,
  onLinkFromArticle,
}: {
  articles: ArticlePreview[]
  competitions: Competition[]
  saving: string | null
  saved: string | null
  onLinkFromArticle: (artId: string, compId: string | null) => void
}) {
  // Build a map: article_id → competition
  const artToComp = useMemo(() => {
    const map: Record<string, Competition | undefined> = {}
    for (const c of competitions) {
      if (c.article_id) map[c.article_id] = c
    }
    return map
  }, [competitions])

  return (
    <div className="space-y-2">
      {articles.length === 0 && (
        <div className="rounded-xl border border-ink/[0.1] py-12 text-center">
          <p className="font-mono text-sm text-ink/40">No hay artículos publicados</p>
        </div>
      )}
      {articles.map(a => {
        const linked = artToComp[a.id]
        return (
          <div
            key={a.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-ink/[0.08] bg-paper px-4 py-3.5"
          >
            {/* Article info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink leading-snug truncate">{a.title}</p>
              {linked ? (
                <p className="font-mono text-[0.62rem] tracking-wider text-mint uppercase mt-0.5">
                  ✓ {formatFecha(linked.fecha_inicio, linked.fecha_fin)} · {linked.nombre}
                </p>
              ) : (
                <p className="font-mono text-[0.62rem] tracking-wider text-ink/35 uppercase mt-0.5">
                  Sin competición vinculada
                </p>
              )}
            </div>

            {/* Competition selector */}
            <div className="flex items-center gap-2 sm:w-[340px] shrink-0">
              <select
                value={linked?.id ?? ''}
                onChange={e => onLinkFromArticle(a.id, e.target.value || null)}
                disabled={saving === a.id}
                className="flex-1 rounded-lg border border-ink/[0.15] bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-50"
              >
                <option value="">— Sin competición —</option>
                {competitions.map(c => (
                  <option key={c.id} value={c.id}>
                    {formatFecha(c.fecha_inicio, c.fecha_fin)} · {c.nombre}
                    {c.ciudad ? ` (${c.ciudad})` : ''}
                  </option>
                ))}
              </select>
              <div className="w-6 shrink-0">
                {saving === a.id && <Spinner />}
                {saved === a.id && <CheckMark />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCalendarioPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [articles, setArticles] = useState<ArticlePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [mesActivo, setMesActivo] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'comps' | 'articles'>('comps')

  useEffect(() => {
    async function load() {
      const [compRes, artRes] = await Promise.all([
        supabase
          .from('competitions')
          .select('id, fecha_inicio, fecha_fin, disciplina, nombre, area, ciudad, article_id, article:articles(slug, title)')
          .order('fecha_inicio'),
        supabase
          .from('articles')
          .select('id, title, slug, excerpt, cover_image_url, category, published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
      ])
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const rawComps = (compRes.data ?? []) as any[]
      setCompetitions(rawComps.map((c: any) => ({
        ...c,
        article: Array.isArray(c.article) ? (c.article[0] ?? null) : (c.article ?? null),
      })))
      /* eslint-enable @typescript-eslint/no-explicit-any */
      setArticles(artRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  // Competition → article (tab 1 direction)
  async function handleLinkComp(competitionId: string, articleId: string | null) {
    setSaving(competitionId)
    const { error } = await supabase
      .from('competitions')
      .update({ article_id: articleId })
      .eq('id', competitionId)

    if (!error) {
      const art = articles.find(a => a.id === articleId) ?? null
      setCompetitions(prev =>
        prev.map(c =>
          c.id !== competitionId ? c : {
            ...c,
            article_id: articleId,
            article: art ? { slug: art.slug, title: art.title } : null,
          }
        )
      )
      setSaved(competitionId)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  // Article → competition (tab 2 direction: we update the competition's article_id)
  async function handleLinkFromArticle(articleId: string, compId: string | null) {
    setSaving(articleId)

    // First, clear any existing competition that had this article linked
    const prev = competitions.find(c => c.article_id === articleId)
    if (prev && prev.id !== compId) {
      await supabase
        .from('competitions')
        .update({ article_id: null })
        .eq('id', prev.id)
    }

    if (compId) {
      const { error } = await supabase
        .from('competitions')
        .update({ article_id: articleId })
        .eq('id', compId)

      if (!error) {
        const art = articles.find(a => a.id === articleId) ?? null
        setCompetitions(ps =>
          ps.map(c => {
            if (c.id === compId)   return { ...c, article_id: articleId, article: art ? { slug: art.slug, title: art.title } : null }
            if (prev && c.id === prev.id) return { ...c, article_id: null, article: null }
            return c
          })
        )
        setSaved(articleId)
        setTimeout(() => setSaved(null), 2000)
      }
    } else {
      // Just clear — prev was already cleared above
      setCompetitions(ps =>
        ps.map(c => prev && c.id === prev.id ? { ...c, article_id: null, article: null } : c)
      )
      setSaved(articleId)
      setTimeout(() => setSaved(null), 2000)
    }

    setSaving(null)
  }

  const mesesConDatos = useMemo(() =>
    Array.from(new Set(competitions.map(c => getMes(c.fecha_inicio)))).sort((a,b)=>a-b),
    [competitions]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="font-mono text-sm text-ink/40 animate-pulse">Cargando calendario…</div>
      </div>
    )
  }

  const vinculadas = competitions.filter(c => c.article_id).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-brand text-3xl font-extrabold tracking-brand text-ink mb-1">
          Calendario 2026
        </h1>
        <p className="text-sm text-ink/50">
          {competitions.length} competiciones ·{' '}
          <span className="text-mint font-semibold">{vinculadas} vinculadas</span> a análisis de lanedata
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-ink/[0.1] mb-6">
        <Tab active={tab === 'comps'} onClick={() => setTab('comps')}>
          Competiciones
        </Tab>
        <Tab active={tab === 'articles'} onClick={() => setTab('articles')}>
          Por artículo
        </Tab>
      </div>

      {tab === 'comps' ? (
        <CompetitionsTab
          competitions={competitions}
          articles={articles}
          saving={saving}
          saved={saved}
          onLink={handleLinkComp}
          mesActivo={mesActivo}
          setMesActivo={setMesActivo}
          search={search}
          setSearch={setSearch}
          mesesConDatos={mesesConDatos}
        />
      ) : (
        <ArticlesTab
          articles={articles}
          competitions={competitions}
          saving={saving}
          saved={saved}
          onLinkFromArticle={handleLinkFromArticle}
        />
      )}

      <p className="mt-6 text-xs text-ink/35 font-mono text-center">
        Los cambios se guardan automáticamente. Recuerda publicar la web para que aparezcan en el calendario público.
      </p>
    </div>
  )
}
