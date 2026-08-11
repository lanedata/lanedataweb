import { categoryLabel } from '@/lib/utils'

interface Props {
  category: string | null
  variant?: 'mint' | 'ink' | 'cream'
}

export function CategoryBadge({ category, variant = 'mint' }: Props) {
  if (!category) return null

  const styles = {
    mint: 'bg-mint text-ink',
    ink: 'bg-ink text-cream',
    cream: 'bg-cream text-ink',
  }

  return (
    <span
      className={`inline-block px-2.5 py-1 label-mono text-[0.625rem] font-semibold ${styles[variant]}`}
    >
      {categoryLabel(category)}
    </span>
  )
}
