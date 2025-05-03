// src/app/(app)/layout.tsx
import type React from "react"
import { redirect } from "next/navigation"
import { Nav } from "@/components/layout/nav"
import { getUser } from "@/auth/server"
import { upsertProfile } from "@/actions/profiles"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) redirect("/auth")

  await upsertProfile(user.id, user.email)

  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  )
}