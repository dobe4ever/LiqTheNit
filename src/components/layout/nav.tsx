// src/components/layout/nav.tsx

"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavUser } from "./nav-user"
import { Logo } from "@/components/logo"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createCliClient } from "@/auth/client" // Use client helper
import { signOut } from "@/actions/auth" // Use action
import { useToast } from "@/hooks/use-toast"

const items = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function Nav() {
  const path = usePathname()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user on client mount
  useEffect(() => {
    const cli = createCliClient()
    const fetchUser = async () => {
      setLoading(true)
      const { data: { user: u }, error } = await cli.auth.getUser()
      if (error) console.error("Nav fetch user error:", error.message)
      setUser(u)
      setLoading(false)
    }
    fetchUser()
    // Listen for auth changes
    const { data: { subscription } } = cli.auth.onAuthStateChange((_event: any, session: { user: any }) => { // Add session parameter
      setUser(session?.user ?? null) // Use session.user here
      setLoading(false) // Update loading state on change
    })
    return () => subscription?.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    setLoading(true) // Show loading on avatar
    const result = await signOut() // Call server action
    if (result?.error) {
      toast({ title: "Sign out error", description: result.error, variant: "destructive" })
      setLoading(false) // Reset loading on error
    }
    // Redirect is handled by the action
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* Logo (Desktop) */}
        <div className="hidden items-center pl-2 sm:flex">
          <Logo className="h-9 w-7.5 text-primary mr-1.5" />
          <Link href="/" className="text-3xl font-bold">NIT</Link>
        </div>

        {/* Nav Links (Desktop) */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {items.map((item) => {
            const isActive = path === item.href
            return (
              <Link key={item.href} href={item.href} passHref>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-x-1.5">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              </Link>
            )
          })}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loading} />
        </div>

        {/* Nav Links (Mobile) */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {items.map((item) => {
            const isActive = path === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                <item.icon className="mb-0.5 h-5 w-5" /> <span>{item.label}</span>
              </Link>
            )
          })}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loading} />
        </div>
      </div>
    </nav>
  )
}