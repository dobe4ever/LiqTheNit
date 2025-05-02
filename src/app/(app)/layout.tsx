import type React from "react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { getSupabaseServerClient } from "@/app/supabase/server"
import { getSupabaseAdmin } from "@/app/supabase/admin"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = getSupabaseServerClient()
  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/auth")
  }

  // Use upsert operation to handle the case where the profile might already exist
  // This will update the profile if it exists, or create it if it doesn't
  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: data.user.id,
      username: data.user.email?.split("@")[0] || "user",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id", // Specify the conflict target
      ignoreDuplicates: false, // Update the row if it already exists
    },
  )
  
  return (
    <div className="flex min-h-screen flex-col m-2">
      <div>
        <Navbar />
      </div>
      <main className="flex-1 p-2 md:p-6 mt-0 sm:mt-0">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}