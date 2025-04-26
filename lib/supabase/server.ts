import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function getSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options })
      },
    },
  })
}
