// components/nav-user.tsx

"use client"

import { Moon, Sun, LogOut, User as UserIcon, Loader2 } from "lucide-react"
// No longer need useTheme here
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"
import { SwitchTheme } from "./layout/switch-theme" // Import the new component

// Function to get initials from email (keep existing)
function getInitials(email: string | undefined): string {
  if (!email) return "?"
  const parts = email.split("@")[0]
  const nameParts = parts.split(/[._-]/) // Split by common separators
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
  } else if (parts.length > 1) {
    return (parts[0] + parts[1]).toUpperCase()
  } else if (parts.length === 1 && parts[0]) {
    return parts[0][0].toUpperCase()
  }
  return email[0]?.toUpperCase() ?? "?"
}

export function NavUser({
  user,
  onSignOut,
  isLoading,
}: {
  user: User | null
  onSignOut: () => Promise<void>
  isLoading: boolean
}) {
  // useTheme hook is now inside SwitchTheme component

  const triggerContent = isLoading ? (
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  ) : (
    <Avatar className="h-8 w-8">
      <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
    </Avatar>
  )

  if (!user && !isLoading) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          {triggerContent}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || user?.email?.split("@")[0]}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Preferences Label */}
          <DropdownMenuLabel className="text-muted-foreground">
            Preferences
          </DropdownMenuLabel>

          {/* --- Theme Toggle Section --- */}
          {/* Wrap SwitchTheme in a DropdownMenuItem */}
          {/* Prevent default selection behavior to keep menu open */}
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="cursor-default focus:bg-transparent" // Make item non-interactive visually
          >
            {/* Render the SwitchTheme component */}
            <SwitchTheme />
          </DropdownMenuItem>
          {/* --- End Theme Toggle Section --- */}

        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Sign Out Item */}
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer"> {/* Ensure sign out is clickable */}
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}