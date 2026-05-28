// Server component — renders sanitized HTML with editorial styles.
// The HTML was already sanitized server-side before storage.

interface Props {
  html: string
}

export function ArticleContent({ html }: Props) {
  return (
    <div
      className="article-body mx-auto max-w-reading"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
