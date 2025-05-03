"use server"
// Remove: import { createAdminClient } from "@/auth/server"
import { createClient } from "@/auth/server" // Keep this import

// Upsert profile (used on layout and sign up)
export async function upsertProfile(userId: string, email?: string) {
  const supabaseAdmin = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const username = email?.split("@")[0] || `user_${userId.substring(0, 6)}`

  try {
    const { error } = await supabaseAdmin.from("profiles").upsert(
      { id: userId, username, email, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    )
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    console.error("Upsert Profile Error:", error.message)
    return { error: "Failed to update profile." }
  }
}