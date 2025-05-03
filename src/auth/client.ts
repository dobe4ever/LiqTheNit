"use client"
import { createBrowserClient } from "@supabase/ssr"

// Create browser client instance (singleton)
let client: ReturnType<typeof createBrowserClient> | null = null

export function createCliClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}