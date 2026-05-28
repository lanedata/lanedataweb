export interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  html_content: string
  cover_image_url: string | null
  category: string | null
  published_at: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

// Subset used for listing pages (no heavy html_content)
export type ArticlePreview = Pick<
  Article,
  'id' | 'title' | 'slug' | 'excerpt' | 'cover_image_url' | 'category' | 'published_at'
>

// Form state in the admin
export interface ArticleFormData {
  title: string
  slug: string
  excerpt: string
  html_content: string
  cover_image_url: string
  category: string
  published_at: string
  status: 'draft' | 'published'
}
