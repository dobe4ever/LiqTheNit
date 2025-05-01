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
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Removed sessionId from props
export function GameForm() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [formLoading, setFormLoading] = useState(false) // Renamed loading state
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Fetch active session ID
  useEffect(() => {
    const fetchActiveSession = async () => {
      setSessionLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          // No need to push to /auth, layout should handle this
          setSessionLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", userData.user.id)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .maybeSingle()

        if (error) throw error

        setActiveSessionId(data?.id ?? null)
      } catch (error: any) {
        console.error("Error fetching active session for game form:", error)
        toast({
          title: "Error",
          description: "Could not determine active session.",
          variant: "destructive",
        })
        setActiveSessionId(null)
      } finally {
        setSessionLoading(false)
      }
    }

    fetchActiveSession()
    // Add listener for auth changes which might affect session status indirectly
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      // Re-fetch session when auth state changes (e.g., logout)
      fetchActiveSession()
    })

    // Cleanup listener on component unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSessionId) {
      toast({ title: "Error", description: "No active session found.", variant: "destructive" })
      return
    }
    if (!startStack) {
      toast({ title: "Error", description: "Please enter a starting stack value.", variant: "destructive" })
      return
    }

    setFormLoading(true) // Use formLoading state

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth") // Redirect if user somehow lost auth
        return
      }

      const { error } = await supabase.from("games").insert([
        {
          session_id: activeSessionId, // Use fetched session ID
          user_id: userData.user.id,
          game_type: gameType,
          buy_in: Number.parseInt(buyIn),
          start_stack: Number.parseInt(startStack),
          start_time: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast({ title: "Success", description: "Game started successfully." })
      setStartStack("")
      router.refresh() // Refresh page to update ActiveGamesList
    } catch (error: any) {
      console.error("Error starting game:", error)
      toast({ title: "Error", description: "Failed to start game.", variant: "destructive" })
    } finally {
      setFormLoading(false) // Use formLoading state
    }
  }

  // Render loading state or message if no active session
  if (sessionLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </CardContent>
        <CardFooter>
          <div className="h-10 bg-muted rounded w-full"></div>
        </CardFooter>
      </Card>
    )
  }

  if (!activeSessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Start a session to add new games.</p>
        </CardContent>
      </Card>
    )
  }

  // Render the form if session is active
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