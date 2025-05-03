"use client"
import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDt, hrsDiff } from "@/lib/date" // Use renamed utils
import { fmtUBtc, uBtcToUsd, fmtMoney } from "@/lib/num" // Use renamed utils
import { useToast } from "@/hooks/use-toast"
import { getActiveGames, endGame } from "@/actions/games" // Use actions
import { getBtcUsd } from "@/services/btc" // Use service action
import type { Game } from "@/types/db"
import { createCliClient } from "@/auth/client" // Use client helper

export function ActiveGames() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isUser, setIsUser] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null) // Track which game is being ended
  const [endStack, setEndStack] = useState<string>("")
  const [isEnding, startEndTransition] = useTransition() // Loading state for ending a game
  const router = useRouter()
  const { toast } = useToast()

  // Fetch data (games and BTC price)
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Check auth first
      const cli = createCliClient()
      const { data: { user } } = await cli.auth.getUser()
      setIsUser(!!user)
      if (!user) {
          setGames([])
          setLoading(false)
          return
      }

      // Fetch games and price in parallel
      const [gamesRes, price] = await Promise.all([getActiveGames(), getBtcUsd()])

      if (gamesRes.error) throw new Error(gamesRes.error)

      setGames(gamesRes.data || [])
      setBtcPrice(price)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch data.", variant: "destructive" })
      setGames([]) // Clear games on error
    } finally {
      setLoading(false)
    }
  }, [toast]) // Add toast as dependency

  // Fetch data on mount and refresh
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle starting the end game process
  const handleEndClick = (game: Game) => {
    setEndingId(game.id)
    setEndStack(game.start_stack.toString()) // Pre-fill with start stack
  }

  // Handle submitting the end game form
  const submitEnd = (gameId: string) => {
    if (!endStack) {
      toast({ title: "Missing Stack", variant: "destructive" })
      return
    }
    startEndTransition(async () => {
      const result = await endGame(gameId, endStack)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game ended." })
        setEndingId(null) // Reset ending state
        setEndStack("")
        fetchData() // Re-fetch to update list
        router.refresh() // Refresh potentially other parts of the page
      }
    })
  }

  // Cancel ending a game
  const cancelEnd = () => {
    setEndingId(null)
    setEndStack("")
  }

  // --- Render Logic ---

  // Initial Loading Skeleton
  if (loading && games.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-md"></div> {/* Adjusted height */}
          <div className="h-32 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  // No User or No Active Games Message
  if (!isUser || (!loading && games.length === 0)) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {!isUser ? "Log in to see games." : "No active games."}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active Games List
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => {
          const isCurrentEnding = endingId === game.id
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type}</CardTitle>
                    <CardDescription>Start: {fmtDt(game.start_time)}</CardDescription> {/* Use fmtDt */}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtUBtc(game.buy_in)}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(game.buy_in, btcPrice))}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Start Stack */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <div className="text-right">
                      <span className="font-medium">{fmtUBtc(game.start_stack)}</span>
                      <div className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(game.start_stack, btcPrice))}</div>
                    </div>
                  </div>
                  {/* Time Elapsed */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{hrsDiff(game.start_time, new Date()).toFixed(1)} h</span> {/* Use hrsDiff */}
                  </div>
                </div>

                {/* End Game Form */}
                {isCurrentEnding && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-${game.id}`}>End Stack (µ)</Label>
                      <Input id={`end-${game.id}`} type="number" value={endStack}
                        onChange={(e) => setEndStack(e.target.value)} placeholder="Enter end stack"
                        required disabled={isEnding} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEnd(game.id)} className="flex-1" disabled={isEnding}>
                        {isEnding ? "Confirm..." : "Confirm"}
                      </Button>
                      <Button onClick={cancelEnd} variant="outline" className="flex-1" disabled={isEnding}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              {/* End Game Button */}
              {!isCurrentEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndClick(game)} variant="default" className="w-full" disabled={loading || isEnding}>
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