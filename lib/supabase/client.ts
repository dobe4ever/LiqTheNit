"use client"

import { createBrowserClient } from "@supabase/ssr"

// Create a single instance of the Supabase client to be used throughout the app
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabaseClient
}
