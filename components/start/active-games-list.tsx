"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime, getHoursDifference } from "@/lib/utils/date-formatter"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"

interface Game {
  id: string
  game_type: string
  buy_in: number
  start_stack: number
  end_stack: number | null
  start_time: string
  end_time: string | null
  session_id: string // Keep session_id if needed elsewhere, though not used in fetch logic now
}

// Removed sessionId prop
export function ActiveGamesList() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [listLoading, setListLoading] = useState(true) // Separate loading for the list
  const [endingGame, setEndingGame] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Fetch active session ID
  const fetchActiveSession = useCallback(async () => {
    setSessionLoading(true)
    setActiveSessionId(null) // Reset session ID before fetching
    setGames([]) // Clear games when session might change
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
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
      console.error("Error fetching active session for games list:", error)
      toast({ title: "Error", description: "Could not determine active session.", variant: "destructive" })
      setActiveSessionId(null)
    } finally {
      setSessionLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchActiveSession()
    // Add listener for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      fetchActiveSession()
    })
    return () => {
      subscription?.unsubscribe()
    }
  }, [fetchActiveSession]) // Depend on the memoized function

  // Fetch active games based on the activeSessionId
  const fetchData = useCallback(async () => {
    if (!activeSessionId) {
      setGames([]) // Ensure games are cleared if no session ID
      setListLoading(false)
      return
    }

    setListLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth") // Should be handled by layout/session fetch, but belt-and-suspenders
        return
      }

      const [gamesResponse, priceResponse] = await Promise.all([
        supabase
          .from("games")
          .select("*")
          .eq("session_id", activeSessionId) // Use the fetched activeSessionId
          .eq("user_id", userData.user.id)
          .is("end_time", null)
          .order("start_time", { ascending: false }),
        getBitcoinPriceInUSD(),
      ])

      if (gamesResponse.error) throw gamesResponse.error

      setGames(gamesResponse.data || [])
      setBtcPrice(priceResponse)
    } catch (error: any) {
      console.error("Error fetching active games:", error)
      toast({ title: "Error", description: "Failed to fetch active games.", variant: "destructive" })
      setGames([]) // Clear games on error
    } finally {
      setListLoading(false)
    }
    // Removed sessionId dependency, added activeSessionId
  }, [activeSessionId, router, toast, supabase])

  // useEffect calls fetchData when activeSessionId changes
  useEffect(() => {
    fetchData()
  }, [activeSessionId, fetchData]) // Now depends on activeSessionId

  const handleEndGame = (gameId: string) => {
    setEndingGame(gameId)
    const game = games.find((g) => g.id === gameId)
    if (game) {
      setEndStack(game.start_stack.toString())
    }
  }

  const submitEndGame = async (gameId: string) => {
    if (!endStack) {
      toast({ title: "Error", description: "Please enter an ending stack value.", variant: "destructive" })
      return
    }

    setListLoading(true) // Indicate loading during submission
    try {
      const { error } = await supabase
        .from("games")
        .update({
          end_stack: Number.parseInt(endStack),
          end_time: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (error) throw error

      toast({ title: "Success", description: "Game ended successfully." })
      setEndingGame(null)
      setEndStack("")
      fetchData() // Re-fetch data after ending game
      router.refresh() // Still good to refresh for other potential updates on the page
    } catch (error: any) {
      console.error("Error ending game:", error)
      toast({ title: "Error", description: "Failed to end game.", variant: "destructive" })
    } finally {
      // Ensure loading state is reset even if fetchData is called
      // Note: listLoading might be immediately set to true by fetchData,
      // but we ensure it's false if the submit logic finishes first.
      setListLoading(false)
    }
  }

  const cancelEndGame = () => {
    setEndingGame(null)
    setEndStack("")
  }

  // Combined loading state
  const isLoading = sessionLoading || listLoading

  // Render initial loading state
  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  // Render message if no active session
  if (!activeSessionId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active session. Start a session to see active games.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render active games list
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {listLoading && games.length === 0 && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      )}

      {!listLoading && games.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active games in this session. Start a new game to see it here.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {games.map((game) => {
          const isEnding = endingGame === game.id
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type} Game</CardTitle>
                    <CardDescription>Started at {formatDateTime(game.start_time)}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUBTC(game.buy_in)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatMoney(convertUBTCtoUSD(game.buy_in, btcPrice))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Starting Stack:</span>
                    <div>
                      <span className="font-medium">{formatUBTC(game.start_stack)}</span>
                      <div className="text-sm text-muted-foreground">
                        {formatMoney(convertUBTCtoUSD(game.start_stack, btcPrice))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Running Time:</span>
                    <span className="font-medium">
                      {getHoursDifference(game.start_time, new Date().toISOString()).toFixed(2)} hours
                    </span>
                  </div>
                </div>

                {isEnding && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-stack-${game.id}`}>Ending Stack (µBTC)</Label>
                      <Input
                        id={`end-stack-${game.id}`}
                        type="number"
                        value={endStack}
                        onChange={(e) => setEndStack(e.target.value)}
                        placeholder="Enter ending stack"
                        required
                        disabled={listLoading} // Disable input while submitting
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEndGame(game.id)} className="flex-1" disabled={listLoading}>
                        {listLoading ? "Confirming..." : "Confirm"}
                      </Button>
                      <Button onClick={cancelEndGame} variant="outline" className="flex-1" disabled={listLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              {!isEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndGame(game.id)} variant="default" className="w-full" disabled={listLoading}>
                    End Game
                  </Button>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}