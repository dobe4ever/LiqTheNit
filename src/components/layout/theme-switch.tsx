// components/layout/switch-theme.tsx
"use client"

import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils" // Make sure you have this utility or adapt

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    // Outer flex container remains the same
    <div className="flex w-full items-center justify-between">
      <Label htmlFor="theme-switch" className="pr-2 text-foreground cursor-default">
        Theme
      </Label>

      {/* --- Switch and Icon Container --- */}
      {/* Make this container relative to position icons absolutely within it */}
      {/* Needs explicit width to contain the switch + icon positioning */}
      <div className="relative flex items-center w-[46px]"> {/* Adjust width as needed */}
        {/* The Switch Component - Base Layer */}
        <Switch
          id="theme-switch"
          checked={isDark}
          onCheckedChange={toggleTheme}
          className="cursor-pointer w-full" // Make switch fill the container width
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        />

        {/* --- Absolutely Positioned Icons Layer --- */}
        {/* This div sits ON TOP of the switch visually */}
        {/* pointer-events-none allows clicks to pass through to the Switch */}
        <div className="absolute inset-0 flex items-center justify-between px-[4.5px] pointer-events-none">
          {/* Sun Icon (Left side) */}
          <Sun
            className={cn(
              "h-3.5 w-3.5 transition-colors", // Adjust size if needed
              isDark ? "text-black" : "text-yellow-500" // Active when light
            )}
          />
          {/* Moon Icon (Right side) */}
          <Moon
            className={cn(
              "h-3.5 w-3.5 transition-colors", // Adjust size if needed
              isDark ? "text-yellow-400" : "text-muted-foreground/60" // Active when dark
            )}
          />
        </div>
      </div>
    </div>
  )
}