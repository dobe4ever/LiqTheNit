// components/history/games-table.tsx
"use client"

import { useState, useEffect, useCallback } from "react" // Import useCallback
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react" // Import RefreshCw
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

  // --- Refactored Fetch Logic ---
  const fetchData = useCallback(async () => {
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
      // Reset pagination on error maybe?
      // setPage(0);
      // setTotalGames(0);
    } finally {
      setLoading(false)
    }
  }, [page, router, toast, supabase]) // Dependencies for useCallback (page included)

  // --- useEffect calls fetchData ---
  useEffect(() => {
    fetchData()
  }, [page, fetchData]) // page is still a primary trigger

  const handleNextPage = () => {
    if ((page + 1) * pageSize < totalGames) {
      setPage(page + 1) // This change triggers useEffect via page dependency
    }
  }

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1) // This change triggers useEffect via page dependency
    }
  }

  // --- Render Logic ---
  return (
    <Card>
      <div className="flex justify-end p-2 border-b">
        {/* --- Refresh Button --- */}
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Loading Skeleton or Initial Loading */}
      {loading && games.length === 0 && (
        <div className="animate-pulse">
          <div className="p-4">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Games Message */}
      {!loading && games.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          No game history found. Start playing to see your history here.
        </div>
      )}

      {/* Games Table */}
      {games.length > 0 && (
        <>
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
                {/* Map directly inside TableBody */}
                {games.map((game) => {
                  const profit = game.end_stack - game.start_stack
                  const duration = getHoursDifference(game.start_time, game.end_time)

                  return (
                    <TableRow key={game.id}>
                      <TableCell>{formatDateTime(game.end_time)}</TableCell>
                      <TableCell className="capitalize">{game.game_type}</TableCell>
                      <TableCell>{formatUBTC(game.buy_in)}</TableCell>
                      <TableCell>{duration.toFixed(2)} hours</TableCell>
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

          {/* Pagination */}
          {totalGames > pageSize && (
            <div className="flex items-center justify-between px-4 py-2 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalGames)} of {totalGames}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 0 || loading} // Disable pagination during load
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={(page + 1) * pageSize >= totalGames || loading} // Disable pagination during load
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}