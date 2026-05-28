import { createClient } from '@/lib/supabase/server'
import { formatDateEs, categoryLabel } from '@/lib/utils'
import Link from 'next/link'
import { DeleteButton } from '@/components/admin/DeleteButton'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, category, status, published_at, created_at')
    .order('created_at', { ascending: false })

  const published = articles?.filter((a) => a.status === 'published').length ?? 0
  const drafts = articles?.filter((a) => a.status === 'draft').length ?? 0

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-brand text-2xl font-bold tracking-tight text-ink">Artículos</h1>
          <p className="mt-1 label-mono text-ink/40">
            {published} publicado{published !== 1 ? 's' : ''} · {drafts} borrador{drafts !== 1 ? 'es' : ''}
          </p>
        </div>
        <Link
          href="/admin/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-85"
        >
          + Nuevo artículo
        </Link>
      </div>

      {/* Articles table */}
      {!articles || articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink/[0.1] bg-cream/40 py-20 text-center">
          <p className="font-brand text-xl font-bold text-ink/30">Sin artículos todavía</p>
          <p className="mt-2 text-sm text-ink/25">
            Pulsa &ldquo;Nuevo artículo&rdquo; para empezar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/[0.1]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.1] bg-cream/50">
                <th className="px-5 py-3 text-left label-mono text-ink/40">Título</th>
                <th className="hidden px-5 py-3 text-left label-mono text-ink/40 sm:table-cell">Categoría</th>
                <th className="hidden px-5 py-3 text-left label-mono text-ink/40 md:table-cell">Fecha</th>
                <th className="px-5 py-3 text-left label-mono text-ink/40">Estado</th>
                <th className="px-5 py-3 text-right label-mono text-ink/40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => (
                <tr
                  key={article.id}
                  className={`border-b border-ink/[0.06] transition-colors hover:bg-cream/30 ${
                    i === articles.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/editar?id=${article.id}`}
                      className="font-medium text-ink hover:text-ink/70 transition-colors line-clamp-2"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 label-mono text-ink/30">/{article.slug}</p>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span className="label-mono text-ink/45">
                      {article.category ? categoryLabel(article.category) : '—'}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <span className="label-mono text-ink/45">
                      {article.published_at ? formatDateEs(article.published_at) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/articulo/${article.slug}`}
                        target="_blank"
                        className="label-mono text-ink/35 hover:text-ink/60 transition-colors"
                        title="Ver publicado"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/admin/editar?id=${article.id}`}
                        className="label-mono text-ink/35 hover:text-ink/60 transition-colors"
                      >
                        Editar
                      </Link>
                      <DeleteButton id={article.id} title={article.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'published'
      ? 'bg-mint/30 text-ink'
      : 'bg-ink/[0.08] text-ink/50'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 label-mono text-[0.6rem] ${styles}`}>
      {status === 'published' ? 'Publicado' : 'Borrador'}
    </span>
  )
}
