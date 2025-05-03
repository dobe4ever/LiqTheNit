"use server"
// Remove: import { createClient } from "@/auth/server"
import { redirect } from "next/navigation"
import { upsertProfile } from "./profiles"
import { createClient } from "@/auth/server" // Keep this import if getUser is used, or import inside functions

// Handle errors consistently
const handleAuthError = (error: any, context: string) => {
  console.error(`${context} Error:`, error.message)
  return { error: error.message || "An unexpected error occurred." }
}

// Sign in with email/password
export async function signIn(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign In")
  }
  redirect("/")
}

// Sign up with email/password
export async function signUp(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (!signUpData.user) throw new Error("User not created after sign up.")

    const profileResult = await upsertProfile(signUpData.user.id, email)
    if (profileResult.error) throw new Error(profileResult.error)

  } catch (error: any) {
    return handleAuthError(error, "Sign Up")
  }
  return { error: null, message: "Check email for confirmation." }
}

// Sign in with Google OAuth
export async function googleSignIn() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (data.url) redirect(data.url)
  } catch (error: any) {
    return handleAuthError(error, "Google Sign In")
  }
}

// Sign out
export async function signOut() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign Out")
  }
  redirect("/auth")
}