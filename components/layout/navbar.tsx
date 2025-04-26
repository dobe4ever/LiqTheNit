"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Clock, LogOut, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

const navItems = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Success!",
        description: "You have been signed out.",
      })
      router.push("/auth")
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t py-2 sm:py-0 sm:relative sm:border-b sm:border-t-0">
      <div className="container mx-auto flex flex-row justify-between items-center">
        <div className="hidden sm:flex sm:items-center">
          <Link href="/" className="text-xl font-bold">
            LiqTheNit
          </Link>
        </div>

        <div className="flex w-full sm:w-auto justify-around sm:justify-center sm:gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col sm:flex-row items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive ? "text-primary bg-muted" : "text-muted-foreground hover:text-primary hover:bg-muted/50"}`}
              >
                <Icon className="h-5 w-5 sm:mr-1.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="hidden sm:block">
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
