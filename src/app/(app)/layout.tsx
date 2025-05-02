// src/app/(app)/layout.tsx
import type React from "react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { getUser } from "@/auth/server"
import { upsertProfile } from "@/actions/profile"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser() 

  if (!user) {
    redirect("/auth")
  }

  // Call upsert action after successful auth check
  await upsertProfile(user.id, user.email)

  return (
    <div className="flex min-h-screen flex-col m-2">
      <Navbar user={user} /> 
      <main className="flex-1 p-2 md:p-6 mt-0 sm:mt-0">
        <div className="container mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}