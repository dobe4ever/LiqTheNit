// src/actions/profile.ts
"use server"
import { createSrvClient } from "@/auth/server"
import { Database } from "@/types/db" // Import Database type

// Type helper for profile insert/update
type ProfileUpsert = Omit<Database["public"]["Tables"]["profiles"]["Insert"], "created_at"> & { created_at?: string } // Adjust if needed based on actual schema

export async function upsertProfile(userId: string, email?: string) {
  const supabase = createSrvClient()

  // Prepare data based on actual profiles schema (NO updated_at)
  const profileData: Pick<ProfileUpsert, "id" | "username" | "email"> = {
    id: userId,
    username: email?.split("@")[0] || "user",
    email: email || null,
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(profileData, {
       onConflict: "id",
       ignoreDuplicates: false // Ensures update if exists
      });
}