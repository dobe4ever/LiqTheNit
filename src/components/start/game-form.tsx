"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"

export function GameForm() {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [formLoading, setFormLoading] = useState(false)
  const [isUser, setIsUser] = useState(false) // Track auth state
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Check auth state
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsUser(!!user)
    }
    checkUser()

  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
      return
    }
    if (!startStack) {
      toast({ title: "Error", description: "Enter starting stack.", variant: "destructive" })
      return
    }

    setFormLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found") // Should not happen if isUser is true

      const { error } = await supabase.from("games").insert([
        {
          // session_id removed
          user_id: user.id,
          game_type: gameType,
          buy_in: Number.parseInt(buyIn),
          start_stack: Number.parseInt(startStack),
          start_time: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast({ title: "Success", description: "Game started." })
      setStartStack("")
      router.refresh()
    } catch (error: any) {
      console.error("Error starting game:", error)
      toast({ title: "Error", description: "Failed to start game.", variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  // Render message if not logged in
  if (!isUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Log in to start a game.</p>
        </CardContent>
      </Card>
    )
  }

  // Render the form if logged in
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Game</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-type">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType} disabled={formLoading}>
              <SelectTrigger id="game-type">
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µBTC)</Label>
            <Select value={buyIn} onValueChange={setBuyIn} disabled={formLoading}>
              <SelectTrigger id="buy-in">
                <SelectValue placeholder="Select buy in amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 µBTC</SelectItem>
                <SelectItem value="100">100 µBTC</SelectItem>
                <SelectItem value="200">200 µBTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-stack">Starting Stack (µBTC)</Label>
            <Input
              id="start-stack"
              type="number"
              value={startStack}
              onChange={(e) => setStartStack(e.target.value)}
              placeholder="Enter starting stack"
              disabled={formLoading}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={formLoading}>
            {formLoading ? "Starting..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}