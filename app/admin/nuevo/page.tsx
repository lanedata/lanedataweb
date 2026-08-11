import { ArticleForm } from '@/components/admin/ArticleForm'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nuevo artículo' }

export default function NewArticlePage() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/admin/articulos"
          className="label-mono text-ink/35 hover:text-ink/60 transition-colors"
        >
          ← Volver
        </Link>
        <span className="text-ink/20">/</span>
        <h1 className="font-brand text-xl font-bold tracking-tight text-ink">Nuevo artículo</h1>
      </div>
      <ArticleForm />
    </div>
  )
}
