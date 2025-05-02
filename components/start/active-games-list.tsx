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
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import type { User } from "@supabase/supabase-js" // Import User type

interface Game {
  id: string
  game_type: string
  buy_in: number
  start_stack: number
  end_stack: number | null
  start_time: string
  end_time: string | null
  // session_id removed
}

export function ActiveGamesList() {
  const [user, setUser] = useState<User | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [endingGame, setEndingGame] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Fetch user and listen for changes
  useEffect(() => {
    const fetchUser = async () => {
      setListLoading(true) // Start loading when checking user
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error("Error fetching user:", error)
        toast({ title: "Error", description: "Failed to get user.", variant: "destructive" })
        setUser(null)
      } else {
        setUser(user)
      }
      // Set loading false here or after data fetch? Let's keep it true until data is fetched.
    }
    fetchUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setUser(user ?? null)
      // If user changes, we need to re-fetch data, handled by fetchData dependency on 'user'
    })
    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, toast])

  // Fetch active games based on user
  const fetchData = useCallback(async () => {
    if (!user) {
      setGames([]) // Clear games if no user
      setListLoading(false) // Stop loading if no user
      return
    }

    setListLoading(true)
    try {
      const [gamesResponse, priceResponse] = await Promise.all([
        supabase
          .from("games")
          .select("*")
          .eq("user_id", user.id) // Fetch based on user_id
          .is("end_time", null) // Only active games
          .order("start_time", { ascending: false }),
        getBitcoinPriceInUSD(),
      ])

      if (gamesResponse.error) throw gamesResponse.error

      setGames(gamesResponse.data || [])
      setBtcPrice(priceResponse)
    } catch (error: any) {
      console.error("Error fetching active games:", error)
      toast({ title: "Error", description: "Failed to fetch active games.", variant: "destructive" })
      setGames([])
    } finally {
      setListLoading(false)
    }
  }, [user, toast, supabase]) // Depends on user

  // useEffect calls fetchData when user changes
  useEffect(() => {
    fetchData()
  }, [user, fetchData]) // Fetch data when user state is confirmed/changed

  const handleEndGame = (gameId: string) => {
    setEndingGame(gameId)
    const game = games.find((g) => g.id === gameId)
    if (game) {
      setEndStack(game.start_stack.toString())
    }
  }

  const submitEndGame = async (gameId: string) => {
    if (!endStack) {
      toast({ title: "Error", description: "Enter ending stack.", variant: "destructive" })
      return
    }

    setListLoading(true)
    try {
      const { error } = await supabase
        .from("games")
        .update({
          end_stack: Number.parseInt(endStack),
          end_time: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (error) throw error

      toast({ title: "Success", description: "Game ended." })
      setEndingGame(null)
      setEndStack("")
      fetchData() // Re-fetch data
      router.refresh()
    } catch (error: any) {
      console.error("Error ending game:", error)
      toast({ title: "Error", description: "Failed to end game.", variant: "destructive" })
    } finally {
      // fetchData will set listLoading to false
    }
  }

  const cancelEndGame = () => {
    setEndingGame(null)
    setEndStack("")
  }

  // Render loading state
  if (listLoading && games.length === 0) { // Show skeleton only on initial load or when user changes
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-md"></div>
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  // Render message if no user or no active games
  if (!user || (!listLoading && games.length === 0)) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            { !user ? "Log in to see active games." : "No active games. Start one above!" }
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
        <Button variant="outline" size="sm" onClick={fetchData} disabled={listLoading}>
          <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => {
          const isEnding = endingGame === game.id
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type} Game</CardTitle>
                    <CardDescription>Started {formatDateTime(game.start_time)}</CardDescription>
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
                    <span className="text-muted-foreground">Start Stack:</span>
                    <div>
                      <span className="font-medium">{formatUBTC(game.start_stack)}</span>
                      <div className="text-sm text-muted-foreground">
                        {formatMoney(convertUBTCtoUSD(game.start_stack, btcPrice))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">
                      {getHoursDifference(game.start_time, new Date().toISOString()).toFixed(2)} h
                    </span>
                  </div>
                </div>

                {isEnding && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-stack-${game.id}`}>End Stack (µBTC)</Label>
                      <Input
                        id={`end-stack-${game.id}`}
                        type="number"
                        value={endStack}
                        onChange={(e) => setEndStack(e.target.value)}
                        placeholder="Enter ending stack"
                        required
                        disabled={listLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEndGame(game.id)} className="flex-1" disabled={listLoading}>
                        {listLoading ? "Confirm..." : "Confirm"}
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