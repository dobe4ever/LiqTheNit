// src/components/start/active-games-list.tsx
"use client"
import { useState, useEffect, useTransition, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime, getHoursDifference } from "@/lib/utils/date"
import { formatUBTC, formatMoney, convertUBTCtoUSD } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { getActiveGames, endGame } from "@/actions/game" // Import actions
import type { Game } from "@/types/db"

export function ActiveGamesList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition() // For ending game
  const [endingGameId, setEndingGameId] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [gamesResult, price] = await Promise.all([
        getActiveGames(), // Fetch using action
        getBitcoinPriceInUSD(),
      ])
      if (gamesResult.error) throw new Error(gamesResult.error)
      setGames(gamesResult.data || [])
      setBtcPrice(price)
    } catch (error: any) {
      toast({ title: "Error", description: `Fetch failed: ${error.message}`, variant: "destructive" })
      setGames([]) // Clear data on error
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
    // Optional: Add polling or Supabase real-time listener for updates if needed
  }, [fetchData])

  const handleEndClick = (game: Game) => {
    setEndingGameId(game.id)
    setEndStack(game.start_stack.toString()) // Pre-fill start stack
  }

  const submitEnd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!endingGameId) return
    const formData = new FormData(e.currentTarget)
    // Ensure gameId is included
    formData.set('gameId', endingGameId)

    startTransition(async () => {
      const result = await endGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game ended." })
        setEndingGameId(null)
        setEndStack("")
        fetchData() // Refresh list
      }
    })
  }

  const cancelEnd = () => {
    setEndingGameId(null)
    setEndStack("")
  }

  const isLoading = loading || isPending

  // Render skeleton/empty states
  if (loading && games.length === 0) {
    return <div className="space-y-4"><div className="h-6 bg-muted rounded w-1/2"></div><div className="animate-pulse space-y-4"><div className="h-24 bg-muted rounded-md"></div></div></div>
  }
  if (!loading && games.length === 0) {
     return <div className="space-y-4"><h2 className="text-xl font-semibold">Active Tables</h2><Card><CardContent className="p-6 text-center text-muted-foreground">No active games.</CardContent></Card></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => {
          const isEnding = endingGameId === game.id
          const time = getHoursDifference(game.start_time, new Date().toISOString()).toFixed(2)
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type}</CardTitle>
                    <CardDescription>Start: {formatDateTime(game.start_time)}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUBTC(game.buy_in)}</div>
                    <div className="text-sm text-muted-foreground">{formatMoney(convertUBTCtoUSD(game.buy_in, btcPrice))}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2">
                   <div className="flex justify-between"><span className="text-muted-foreground">Start Stack:</span><div><span className="font-medium">{formatUBTC(game.start_stack)}</span><div className="text-sm text-muted-foreground">{formatMoney(convertUBTCtoUSD(game.start_stack, btcPrice))}</div></div></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Time:</span><span className="font-medium">{time} h</span></div>
                 </div>

                {isEnding && (
                  <form onSubmit={submitEnd} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-${game.id}`}>End Stack (µ)</Label>
                      <Input name="endStack" id={`end-${game.id}`} type="number" value={endStack} onChange={(e) => setEndStack(e.target.value)} required disabled={isPending} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isPending}>{isPending ? "..." : "Confirm"}</Button>
                      <Button type="button" onClick={cancelEnd} variant="outline" className="flex-1" disabled={isPending}>Cancel</Button>
                    </div>
                  </form>
                )}
              </CardContent>
              {!isEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndClick(game)} variant="default" className="w-full" disabled={isLoading}>End</Button>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}