import { createClient } from '@/lib/supabase/server'
import { sanitizeArticleHtml } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/articles — create article with server-side HTML sanitization
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const cleanHtml = sanitizeArticleHtml(body.html_content ?? '')

  const { data, error } = await supabase
    .from('articles')
    .insert({ ...body, html_content: cleanHtml })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/articles/:id — update article with server-side HTML sanitization
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  if (fields.html_content) {
    fields.html_content = sanitizeArticleHtml(fields.html_content)
  }

  const { data, error } = await supabase
    .from('articles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
