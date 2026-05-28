// Cookie-free Supabase client for use during static build (generateStaticParams,
// sitemap, server components). Reads only public data via the anon key.
import { createClient } from '@supabase/supabase-js'

export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
