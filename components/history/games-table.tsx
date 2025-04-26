"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  end_stack: number
  start_time: string
  end_time: string
}

export function GamesTable() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalGames, setTotalGames] = useState(0)
  const pageSize = 25
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

        // Get count of all completed games
        const { count, error: countError } = await supabase
          .from("games")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userData.user.id)
          .not("end_time", "is", null)
          .not("end_stack", "is", null)

        if (countError) throw countError

        setTotalGames(count || 0)

        // Get current page of games
        const [gamesResponse, priceResponse] = await Promise.all([
          supabase
            .from("games")
            .select("*")
            .eq("user_id", userData.user.id)
            .not("end_time", "is", null)
            .not("end_stack", "is", null)
            .order("end_time", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1),
          getBitcoinPriceInUSD(),
        ])

        if (gamesResponse.error) throw gamesResponse.error

        setGames(gamesResponse.data || [])
        setBtcPrice(priceResponse)
      } catch (error: any) {
        console.error("Error fetching games:", error)
        toast({
          title: "Error",
          description: "Failed to fetch games history.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [page, router, toast, supabase])

  const handleNextPage = () => {
    if ((page + 1) * pageSize < totalGames) {
      setPage(page + 1)
    }
  }

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1)
    }
  }

  if (loading && games.length === 0) {
    return (
      <Card className="animate-pulse">
        <div className="p-4">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (games.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center text-muted-foreground">
          No game history found. Start playing to see your history here.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Game Type</TableHead>
              <TableHead>Buy In</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => {
              const profit = game.end_stack - game.start_stack
              const duration = getHoursDifference(game.start_time, game.end_time)

              return (
                <TableRow key={game.id}>
                  <TableCell>{formatDateTime(game.end_time)}</TableCell>
                  <TableCell className="capitalize">{game.game_type}</TableCell>
                  <TableCell>{formatUBTC(game.buy_in)}</TableCell>
                  <TableCell>{duration} hours</TableCell>
                  <TableCell className="text-right">
                    <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>{formatUBTC(profit)}</span>
                    <div className="text-xs text-muted-foreground">
                      {formatMoney(convertUBTCtoUSD(profit, btcPrice))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalGames > pageSize && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalGames)} of {totalGames}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={(page + 1) * pageSize >= totalGames}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
