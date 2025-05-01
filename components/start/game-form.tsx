"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Interface updated: onGameCreated removed
interface GameFormProps {
  sessionId: string
}

// Parameters updated: onGameCreated removed
export function GameForm({ sessionId }: GameFormProps) {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!startStack) {
      toast({
        title: "Error",
        description: "Please enter a starting stack value.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth")
        return
      }

      const { error } = await supabase.from("games").insert([
        {
          session_id: sessionId,
          user_id: userData.user.id,
          game_type: gameType,
          buy_in: Number.parseInt(buyIn),
          start_stack: Number.parseInt(startStack),
          start_time: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast({
        title: "Success",
        description: "Game started successfully.",
      })

      setStartStack("")
      // onGameCreated() call removed (wasn't strictly needed before either)
      router.refresh() // This handles updating the UI/data
    } catch (error: any) {
      console.error("Error starting game:", error)
      toast({
        title: "Error",
        description: "Failed to start game.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Game</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-type">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType} disabled={loading}>
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
            <Select value={buyIn} onValueChange={setBuyIn} disabled={loading}>
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
              disabled={loading}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Starting..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}