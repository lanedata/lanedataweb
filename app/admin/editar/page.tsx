'use client'

import { ArticleForm } from '@/components/admin/ArticleForm'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import type { Article } from '@/types'

function EditArticle() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    createClient()
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setArticle(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="label-mono text-ink/30">Cargando…</span>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="py-20 text-center">
        <p className="font-brand text-xl font-bold text-ink/30">Artículo no encontrado</p>
        <Link href="/admin" className="mt-4 inline-block label-mono text-ink/40 hover:text-ink">
          ← Volver
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link href="/admin" className="label-mono text-ink/35 hover:text-ink/60 transition-colors">
          ← Volver
        </Link>
        <span className="text-ink/20">/</span>
        <h1 className="font-brand text-xl font-bold tracking-tight text-ink line-clamp-1">
          Editar: {article.title}
        </h1>
      </div>
      <ArticleForm article={article} />
    </div>
  )
}

export default function EditArticlePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <span className="label-mono text-ink/30">Cargando…</span>
      </div>
    }>
      <EditArticle />
    </Suspense>
  )
}
