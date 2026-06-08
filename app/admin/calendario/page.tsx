'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Competition, ArticlePreview } from '@/types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getMes(fecha: string) {
  return new Date(fecha + 'T12:00:00').getMonth()
}
function fmtFecha(inicio: string, fin: string | null): string {
  const SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const d1 = new Date(inicio + 'T12:00:00')
  if (!fin || fin === inicio) return `${d1.getDate()} ${SHORT[d1.getMonth()]}`
  const d2 = new Date(fin + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) return `${d1.getDate()}–${d2.getDate()} ${SHORT[d1.getMonth()]}`
  return `${d1.getDate()} ${SHORT[d1.getMonth()]} – ${d2.getDate()} ${SHORT[d2.getMonth()]}`
}

// ─── UI atoms ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5 text-ink/35 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-mint shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 font-mono text-[0.65rem] tracking-widest uppercase transition-colors border-b-2 ${active ? 'border-ink text-ink' : 'border-transparent text-ink/35 hover:text-ink/65'}`}>
      {children}
    </button>
  )
}

// ─── TAB 1: per competition ────────────────────────────────────────────────────
function CompetitionsTab({
  competitions, articles, mesActivo, setMesActivo, search, setSearch, mesesConDatos,
  onLink, saving, saved,
}: {
  competitions: Competition[]
  articles: ArticlePreview[]
  mesActivo: number | null
  setMesActivo: (m: number | null) => void
  search: string
  setSearch: (s: string) => void
  mesesConDatos: number[]
  onLink: (compId: string, artId: string | null) => Promise<void>
  saving: Set<string>
  saved: Set<string>
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
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input type="search" placeholder="Buscar competición, ciudad, disciplina…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-ink/[0.15] bg-cream/60 px-4 py-2 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-mint/40"/>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setMesActivo(null)}
            className={`rounded-full px-3 py-1.5 text-[0.62rem] font-mono tracking-widest uppercase transition-colors ${mesActivo === null ? 'bg-ink text-cream' : 'border border-ink/20 text-ink/50 hover:text-ink'}`}>
            Todos
          </button>
          {mesesConDatos.map(m => (
            <button key={m} onClick={() => setMesActivo(m === mesActivo ? null : m)}
              className={`rounded-full px-3 py-1.5 text-[0.62rem] font-mono tracking-widest uppercase transition-colors ${mesActivo === m ? 'bg-mint text-ink' : 'border border-ink/20 text-ink/50 hover:text-ink'}`}>
              {MESES[m].slice(0,3)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-ink/[0.1] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[6rem_1fr_2fr] bg-ink px-4 py-2.5 gap-4">
          {['Fecha','Competición','Artículo vinculado'].map(h => (
            <span key={h} className="font-mono text-[0.58rem] tracking-widest uppercase text-cream/40">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-ink/[0.06]">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink/35 font-mono">Sin resultados</p>
          )}
          {filtered.map((c, i) => (
            <div key={c.id} className={`flex flex-col sm:grid sm:grid-cols-[6rem_1fr_2fr] gap-2 sm:gap-4 px-4 py-3 sm:items-center ${i % 2 === 0 ? 'bg-paper' : 'bg-cream/25'}`}>
              <div>
                <p className="font-mono text-[0.67rem] tracking-wider text-ink/50 uppercase">{fmtFecha(c.fecha_inicio, c.fecha_fin)}</p>
                {c.disciplina && <p className="font-mono text-[0.58rem] text-ink/30 uppercase mt-0.5">{c.disciplina}</p>}
              </div>
              <div>
                <p className="text-sm font-medium text-ink leading-snug">{c.nombre}</p>
                {c.ciudad && <p className="font-mono text-[0.6rem] text-ink/35 uppercase mt-0.5">{c.ciudad}{c.area ? ` · ${c.area}` : ''}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select value={c.article_id ?? ''} onChange={e => onLink(c.id, e.target.value || null)} disabled={saving.has(c.id)}
                  className="flex-1 rounded-lg border border-ink/[0.13] bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint/40 disabled:opacity-50">
                  <option value="">— Sin artículo —</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {saving.has(c.id) && <Spinner />}
                  {saved.has(c.id) && !saving.has(c.id) && <CheckIcon />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── TAB 2: per article — multi-link ──────────────────────────────────────────
function ArticlesTab({
  articles, competitions, onAdd, onRemove, saving, saved,
}: {
  articles: ArticlePreview[]
  competitions: Competition[]
  onAdd:    (artId: string, compId: string) => Promise<void>
  onRemove: (compId: string) => Promise<void>
  saving: Set<string>
  saved:  Set<string>
}) {
  // Map article_id → competitions[]
  const artToComps = useMemo(() => {
    const map: Record<string, Competition[]> = {}
    for (const a of articles) map[a.id] = []
    for (const c of competitions) {
      if (c.article_id && map[c.article_id]) map[c.article_id].push(c)
    }
    return map
  }, [articles, competitions])

  // Per-article: which competitionId is selected in the add-dropdown
  const [pending, setPending] = useState<Record<string, string>>({})
  const [artSearch, setArtSearch] = useState('')

  const visibleArticles = artSearch.trim()
    ? articles.filter(a => a.title.toLowerCase().includes(artSearch.toLowerCase()))
    : articles

  return (
    <>
      <input type="search" placeholder="Buscar artículo…" value={artSearch} onChange={e => setArtSearch(e.target.value)}
        className="mb-5 w-full sm:max-w-sm rounded-full border border-ink/[0.15] bg-cream/60 px-4 py-2 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-mint/40"/>

      <div className="space-y-3">
        {visibleArticles.map(a => {
          const linked = artToComps[a.id] ?? []
          // Competitions not yet linked to THIS article (can still be linked to others)
          const available = competitions.filter(c => !linked.some(l => l.id === c.id))
          const isSaving  = saving.has(a.id)
          const isSaved   = saved.has(a.id) && !isSaving

          return (
            <div key={a.id} className="rounded-xl border border-ink/[0.08] bg-paper">
              {/* Article title row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-ink/[0.06]">
                <p className="flex-1 text-sm font-semibold text-ink leading-snug">{a.title}</p>
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isSaving && <Spinner />}
                  {isSaved  && <CheckIcon />}
                </div>
              </div>

              <div className="px-4 py-3 flex flex-col gap-3">
                {/* Linked competition chips */}
                {linked.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {linked.map(c => (
                      <div key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 border border-mint/30 pl-2.5 pr-1.5 py-1">
                        <span className="font-mono text-[0.62rem] tracking-wider text-ink/70">
                          {fmtFecha(c.fecha_inicio, c.fecha_fin)} · {c.nombre.length > 40 ? c.nombre.slice(0,40) + '…' : c.nombre}
                        </span>
                        <button onClick={() => onRemove(c.id)}
                          disabled={saving.has(c.id)}
                          aria-label="Desvincular"
                          className="flex h-4 w-4 items-center justify-center rounded-full text-ink/40 hover:bg-ink/10 hover:text-ink transition-colors disabled:opacity-40">
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[0.62rem] tracking-wider text-ink/28 uppercase">Sin competiciones vinculadas</p>
                )}

                {/* Add competition row */}
                <div className="flex items-center gap-2">
                  <select
                    value={pending[a.id] ?? ''}
                    onChange={e => setPending(prev => ({ ...prev, [a.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-ink/[0.13] bg-cream/50 px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint/40">
                    <option value="">Añadir competición…</option>
                    {available.map(c => (
                      <option key={c.id} value={c.id}>
                        {fmtFecha(c.fecha_inicio, c.fecha_fin)} · {c.nombre}{c.ciudad ? ` (${c.ciudad})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!pending[a.id] || isSaving}
                    onClick={async () => {
                      const compId = pending[a.id]
                      if (!compId) return
                      await onAdd(a.id, compId)
                      setPending(prev => ({ ...prev, [a.id]: '' }))
                    }}
                    className="shrink-0 rounded-lg bg-ink px-3 py-1.5 font-mono text-[0.62rem] tracking-widest uppercase text-cream hover:bg-ink/80 disabled:opacity-35 disabled:cursor-not-allowed transition-colors">
                    + Añadir
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCalendarioPage() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [articles,     setArticles]     = useState<ArticlePreview[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState<Set<string>>(new Set())
  const [saved,        setSaved]        = useState<Set<string>>(new Set())
  const [mesActivo,    setMesActivo]    = useState<number | null>(null)
  const [search,       setSearch]       = useState('')
  const [tab,          setTab]          = useState<'comps' | 'articles'>('comps')

  useEffect(() => {
    async function load() {
      const [compRes, artRes] = await Promise.all([
        supabase.from('competitions')
          .select('id, fecha_inicio, fecha_fin, disciplina, nombre, area, ciudad, article_id, article:articles(slug, title)')
          .order('fecha_inicio'),
        supabase.from('articles')
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

  function markSaving(id: string) {
    setSaving(s => new Set(s).add(id))
  }
  function markSaved(id: string) {
    setSaving(s => { const n = new Set(s); n.delete(id); return n })
    setSaved(s  => new Set(s).add(id))
    setTimeout(() => setSaved(s => { const n = new Set(s); n.delete(id); return n }), 2000)
  }

  // TAB 1: link competition → article
  async function handleLinkComp(compId: string, artId: string | null) {
    markSaving(compId)
    const { error } = await supabase.from('competitions').update({ article_id: artId }).eq('id', compId)
    if (!error) {
      const art = articles.find(a => a.id === artId) ?? null
      setCompetitions(prev => prev.map(c =>
        c.id !== compId ? c : { ...c, article_id: artId, article: art ? { slug: art.slug, title: art.title } : null }
      ))
      markSaved(compId)
    } else {
      setSaving(s => { const n = new Set(s); n.delete(compId); return n })
    }
  }

  // TAB 2: add article → competition (multi — does NOT clear existing links)
  async function handleAdd(artId: string, compId: string) {
    markSaving(artId)
    const { error } = await supabase.from('competitions').update({ article_id: artId }).eq('id', compId)
    if (!error) {
      const art = articles.find(a => a.id === artId) ?? null
      setCompetitions(prev => prev.map(c =>
        c.id !== compId ? c : { ...c, article_id: artId, article: art ? { slug: art.slug, title: art.title } : null }
      ))
      markSaved(artId)
    } else {
      setSaving(s => { const n = new Set(s); n.delete(artId); return n })
    }
  }

  // TAB 2: remove one competition link
  async function handleRemove(compId: string) {
    markSaving(compId)
    const { error } = await supabase.from('competitions').update({ article_id: null }).eq('id', compId)
    if (!error) {
      setCompetitions(prev => prev.map(c =>
        c.id !== compId ? c : { ...c, article_id: null, article: null }
      ))
      markSaved(compId)
    } else {
      setSaving(s => { const n = new Set(s); n.delete(compId); return n })
    }
  }

  const mesesConDatos = useMemo(() =>
    Array.from(new Set(competitions.map(c => getMes(c.fecha_inicio)))).sort((a,b) => a-b),
    [competitions]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="font-mono text-sm text-ink/35 animate-pulse">Cargando calendario…</p>
      </div>
    )
  }

  const vinculadas = competitions.filter(c => c.article_id).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-brand text-3xl font-extrabold tracking-brand text-ink mb-1">Calendario 2026</h1>
        <p className="text-sm text-ink/45">
          {competitions.length} competiciones ·{' '}
          <span className="text-mint font-semibold">{vinculadas} con cobertura lanedata</span>
        </p>
      </div>

      <div className="flex gap-0 border-b border-ink/[0.1] mb-6">
        <TabBtn active={tab === 'comps'}    onClick={() => setTab('comps')}>Competiciones</TabBtn>
        <TabBtn active={tab === 'articles'} onClick={() => setTab('articles')}>Por artículo</TabBtn>
      </div>

      {tab === 'comps' ? (
        <CompetitionsTab
          competitions={competitions} articles={articles}
          mesActivo={mesActivo} setMesActivo={setMesActivo}
          search={search} setSearch={setSearch}
          mesesConDatos={mesesConDatos}
          onLink={handleLinkComp} saving={saving} saved={saved}
        />
      ) : (
        <ArticlesTab
          articles={articles} competitions={competitions}
          onAdd={handleAdd} onRemove={handleRemove}
          saving={saving} saved={saved}
        />
      )}

      <p className="mt-6 text-[0.65rem] text-ink/28 font-mono text-center tracking-wider uppercase">
        Los cambios se guardan automáticamente · Publica la web para que aparezcan en el calendario público
      </p>
    </div>
  )
}
