// components/layout/navbar.tsx

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { NavUser } from "@/components/nav-user"
import { LogoSymbol } from "@/components/logo-symbol"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js" // Import User type

const navItems = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  // { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<User | null>(null) // State for user data
  const [loadingUser, setLoadingUser] = useState(true)

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error) {
        console.error("Error fetching user:", error)
        toast({ title: "Error fetching user", description: error.message, variant: "destructive" })
      }
      setUser(user)
      setLoadingUser(false)
    }
    fetchUser()
  }, [supabase, toast])

  const handleSignOut = async () => {
    setLoadingUser(true) // Show loading state while signing out
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast({
        title: "Success!",
        description: "You have been signed out.",
      })
      setUser(null) // Clear user state
      router.push("/auth") // Redirect immediately
      router.refresh() // Ensure layout re-render if needed
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
      setLoadingUser(false) // Reset loading state on error
    }
    // setLoadingUser(false) // This line might be unreachable after push
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      {/* Adjusted padding: p-1 for mobile, sm:py-2 for desktop */}
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* 1. Logo (Desktop only) */}
        <div className="flex items-center justify-left pl-2">
          <div className="hidden sm:flex">
            <LogoSymbol className="h-9 w-7.5 text-primary mr-1.5" />
          </div>
          <div className="hidden sm:flex">
            <Link href="/" className="text-3xl font-bold">
              NIT
            </Link>
          </div>
        </div>

        {/* 2. Desktop Navigation (Desktop only) */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-x-1.5" // Add gap between icon and text
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
          {/* Desktop User Menu Trigger */}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loadingUser} />
        </div>

        {/* 3. Mobile Navigation (Mobile only) */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-primary" // Active mobile style (adjust as needed)
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="mb-0.5 h-5 w-5" /> {/* Slightly smaller icon, margin bottom */}
                <span>{item.label}</span>
              </Link>
            )
          })}
          {/* Mobile User Menu Trigger */}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loadingUser} />
        </div>
      </div>
    </nav>
  )
}