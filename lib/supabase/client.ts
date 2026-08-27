import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. RLS-constrained (anon key). Never has the
// service-role key. See Docs/architecture.md §3.4 and §5.1.
//
// We construct the client lazily so that the module can be imported by
// prerendering code paths (Next.js builds the page tree statically) without
// requiring the env vars at import time. The env check is deferred to first
// use. If the env vars are missing, every call surfaces a clear runtime error
// rather than a build-time crash.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env vars are missing. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  cached = createBrowserClient(url, anon);
  return cached;
}
