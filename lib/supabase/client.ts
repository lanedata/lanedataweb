// Static site (GitHub Pages) — use the standard supabase-js client.
// It stores the session in localStorage, which works correctly without a server.
// Do NOT use createBrowserClient from @supabase/ssr here: that package stores
// sessions in cookies designed for SSR and breaks on purely static deployments.
//
// Singleton pattern: reuse the same instance across the whole browser session to
// avoid the "Multiple GoTrueClient instances detected" warning.
import { createClient as _createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _instance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_instance) return _instance
  _instance = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _instance
}
