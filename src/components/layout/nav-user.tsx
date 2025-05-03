// src/components/layout/nav-user.tsx

"use client"
import { LogOut, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"
import { ThemeSwitch } from "./theme-switch"

// Get initials from email
function getInitials(email?: string): string {
  if (!email) return "?"
  const name = email.split("@")[0]
  return name.substring(0, 2).toUpperCase() // Simpler initials logic
}

export function NavUser({ user, onSignOut, isLoading }: {
  user: User | null
  onSignOut: () => Promise<void>
  isLoading: boolean
}) {
  // Show loader or avatar
  const trigger = isLoading ? (
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  ) : (
    <Avatar className="h-8 w-8">
      <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
    </Avatar>
  )

  // Don't render if not loading and no user
  if (!isLoading && !user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-4" align="end" forceMount>
        {user && ( // Only show content if user exists
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.user_metadata?.name || user.email?.split("@")[0]}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2">Prefs</DropdownMenuLabel> {/* Shortened */}
              {/* Theme Switch Item */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent">
                <ThemeSwitch />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}