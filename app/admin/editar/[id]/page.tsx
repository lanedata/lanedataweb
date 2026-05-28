import { ArticleForm } from '@/components/admin/ArticleForm'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Editar artículo' }

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) notFound()

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/admin"
          className="label-mono text-ink/35 hover:text-ink/60 transition-colors"
        >
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
