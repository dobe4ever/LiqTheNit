// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function getSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions): void {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
          }
        },
        remove(name: string, options: CookieOptions): void {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
          }
        },
      },
    }
  )
}