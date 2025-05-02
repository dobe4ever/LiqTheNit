// src/actions/auth.ts
"use server"
import { createSrvClient } from "@/auth/server"
import { redirect } from "next/navigation"

export async function signIn(data: FormData) {
  const email = data.get("email") as string
  const pass = data.get("password") as string
  const supabase = createSrvClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
  if (error) return { error: error.message }

  redirect("/?toast=loginSuccess")
}

export async function signUp(data: FormData) {
  const email = data.get("email") as string
  const pass = data.get("password") as string
  const supabase = createSrvClient()

  const { error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }

  return { message: "Check email for verification link." }
}

export async function googleSignIn() {
  const supabase = createSrvClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = createSrvClient()
  await supabase.auth.signOut()
  redirect("/auth?toast=signOutSuccess")
}