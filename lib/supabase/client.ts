// Static site (GitHub Pages) — use the standard supabase-js client.
// It stores the session in localStorage, which works correctly without a server.
// Do NOT use createBrowserClient from @supabase/ssr here: that package stores
// sessions in cookies designed for SSR and breaks on purely static deployments.
import { createClient as _createClient } from '@supabase/supabase-js'

export function createClient() {
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
