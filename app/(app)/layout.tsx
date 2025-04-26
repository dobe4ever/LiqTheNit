import type React from "react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = getSupabaseServerClient()

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/auth")
  }

  // Check if the user has a profile, create if needed
  const { data: profile } = await supabase.from("profiles").select().eq("id", data.user.id).single()

  if (!profile) {
    await supabase.from("profiles").insert([{ id: data.user.id, username: data.user.email?.split("@")[0] || "user" }])
  }

  return (
    <div className="flex min-h-screen flex-col pb-16 sm:pb-0">
      <Navbar />
      <main className="flex-1 p-4 md:p-6 mt-0 sm:mt-16">
        <div className="container mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
