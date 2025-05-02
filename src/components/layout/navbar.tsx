// src/components/layout/navbar.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { NavUser } from "@/components/nav-user"
import { LogoSymbol } from "@/components/logo-symbol"
import { useState, useTransition, useEffect } from "react" // Added useTransition, useEffect
import type { User } from "@supabase/supabase-js"
import { signOut } from "@/actions/auth" // Import signOut action
import { useSearchParams } from 'next/navigation' // Import useSearchParams

const navItems = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

// Receive user as prop now
export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams() // Get search params
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Toast notifications based on URL params
  useEffect(() => {
    const toastType = searchParams.get('toast')
    if (toastType === 'loginSuccess') {
      toast({ title: "Success!", description: "Signed in." })
       // Optional: remove toast param from URL
       window.history.replaceState(null, '', pathname)
    } else if (toastType === 'signOutSuccess') {
       toast({ title: "Success!", description: "Signed out." })
       window.history.replaceState(null, '', pathname)
    }
     // Add more toasts as needed
  }, [searchParams, toast, pathname])


  const handleSignOut = async () => {
    startTransition(async () => {
      await signOut() // Call server action
      // Edited to get rid of error
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* Logo */}
        <div className="flex items-center justify-left pl-2">
          <div className="hidden sm:flex"><LogoSymbol className="h-9 w-7.5 text-primary mr-1.5" /></div>
          <div className="hidden sm:flex"><Link href="/" className="text-3xl font-bold">NIT</Link></div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button variant={pathname === item.href ? "secondary" : "ghost"} size="sm" className="gap-x-1.5">
                <item.icon className="h-4 w-4" />{item.label}
              </Button>
            </Link>
          ))}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={isPending} />
        </div>

        {/* Mobile Nav */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium ${pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <item.icon className="mb-0.5 h-5 w-5" /><span>{item.label}</span>
            </Link>
          ))}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={isPending} />
        </div>
      </div>
    </nav>
  )
}