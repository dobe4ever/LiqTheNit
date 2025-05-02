// src/auth/client.ts
"use client"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/types/db" // Import generated types

// Create a singleton Supabase client for browser
let client: ReturnType<typeof createBrowserClient<Database>>

export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>( // Use Database type
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return client
}