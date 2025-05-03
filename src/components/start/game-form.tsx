"use client"
import type React from "react"
import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { startGame } from "@/actions/games" // Use action
import { createCliClient } from "@/auth/client" // Use client helper

export function GameForm() {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [isUser, setIsUser] = useState(false) // Track auth state
  const router = useRouter()
  const { toast } = useToast()

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const cli = createCliClient()
      const { data: { user } } = await cli.auth.getUser()
      setIsUser(!!user)
    }
    checkAuth()
    // Optional: Listen for auth changes if needed, but layout usually handles redirects
  }, [])

  const handleSubmit = (formData: FormData) => {
    if (!isUser) {
      toast({ title: "Auth Required", variant: "destructive" })
      return
    }
    if (!formData.get("startStack")) {
        toast({ title: "Missing Stack", variant: "destructive" })
        return
    }

    startTransition(async () => {
      const result = await startGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game started." })
        setStartStack("") // Clear input on success
        router.refresh() // Refresh page to update active games list
      }
    })
  }

  // Show login message if not authenticated
  if (!isUser) {
    return (
      <Card>
        <CardHeader><CardTitle>Start Game</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Log in to start.</p></CardContent>
      </Card>
    )
  }

  // Show form if authenticated
  return (
    <Card>
      <CardHeader><CardTitle>Start Game</CardTitle></CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Game Type */}
          <div className="space-y-2">
            <Label htmlFor="game-type">Type</Label>
            <Select name="gameType" value={gameType} onValueChange={setGameType} disabled={isPending}>
              <SelectTrigger id="game-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Buy In */}
          <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µ)</Label>
            <Select name="buyIn" value={buyIn} onValueChange={setBuyIn} disabled={isPending}>
              <SelectTrigger id="buy-in"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 µ</SelectItem>
                <SelectItem value="100">100 µ</SelectItem>
                <SelectItem value="200">200 µ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Start Stack */}
          <div className="space-y-2">
            <Label htmlFor="start-stack">Start Stack (µ)</Label>
            <Input id="start-stack" name="startStack" type="number" value={startStack}
              onChange={(e) => setStartStack(e.target.value)} placeholder="Enter stack"
              disabled={isPending} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Starting..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}