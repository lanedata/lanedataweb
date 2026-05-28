/** Spanish month abbreviations */
const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/** "15 mar 2025" */
export function formatDateEs(dateString: string): string {
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "2025-03-15" → ISO for <time datetime> */
export function isoDate(dateString: string): string {
  return dateString.split('T')[0]
}

/** Derive a URL-safe slug from a title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Clamp a string to n characters, adding ellipsis */
export function truncate(text: string, n: number): string {
  if (text.length <= n) return text
  return text.slice(0, n).trimEnd() + '…'
}

/** Strip HTML tags — used for meta descriptions */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Category label — converts slug-style to display */
export function categoryLabel(cat: string | null): string {
  if (!cat) return 'General'
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')
}

/** Reading time estimate in minutes */
export function readingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}
