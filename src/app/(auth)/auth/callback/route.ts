import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createSrvClient } from "@/auth/server" // Use centralized server client

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = createSrvClient() // Use standard server client
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error("Code Exchange Error:", error.message)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin)
}