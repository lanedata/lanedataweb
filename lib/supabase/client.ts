// Static site (GitHub Pages) — standard supabase-js client (localStorage-based).
// Singleton: reuse the same instance to avoid "Multiple GoTrueClient instances" warning.
import { createClient as _createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let _instance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_instance) return _instance
  _instance = _createClient(supabaseUrl, supabaseKey)
  return _instance
}
