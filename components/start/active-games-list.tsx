"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
}

interface ActiveGamesListProps {
  sessionId: string
  onUpdate: () => void
}

export function ActiveGamesList({ sessionId, onUpdate }: ActiveGamesListProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [endingGame, setEndingGame] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/auth")
          return
        }

        const [gamesResponse, priceResponse] = await Promise.all([
          supabase
            .from("games")
            .select("*")
            .eq("session_id", sessionId)
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
        toast({
          title: "Error",
          description: "Failed to fetch active games.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchGames()
    }
  }, [sessionId, router, toast, supabase])

  const handleEndGame = (gameId: string) => {
    setEndingGame(gameId)
    const game = games.find((g) => g.id === gameId)
    if (game) {
      setEndStack(game.start_stack.toString())
    }
  }

  const submitEndGame = async (gameId: string) => {
    if (!endStack) {
      toast({
        title: "Error",
        description: "Please enter an ending stack value.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("games")
        .update({
          end_stack: Number.parseInt(endStack),
          end_time: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Game ended successfully.",
      })

      setEndingGame(null)
      setEndStack("")
      onUpdate()
      router.refresh()

      // Refresh the games list
      setGames(games.filter((g) => g.id !== gameId))
    } catch (error: any) {
      console.error("Error ending game:", error)
      toast({
        title: "Error",
        description: "Failed to end game.",
        variant: "destructive",
      })
    }
  }

  const cancelEndGame = () => {
    setEndingGame(null)
    setEndStack("")
  }

  if (loading && games.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded-md"></div>
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active games. Start a new game to see it here.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Current Active Tables</h2>
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
                      {getHoursDifference(game.start_time, new Date().toISOString())} hours
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
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEndGame(game.id)} className="flex-1">
                        Confirm
                      </Button>
                      <Button onClick={cancelEndGame} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              {!isEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndGame(game.id)} variant="default" className="w-full">
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
