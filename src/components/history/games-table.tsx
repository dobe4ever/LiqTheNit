"use client"
import { useState, useEffect, useCallback, useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card" // Shorter names
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtDt, hrsDiff } from "@/lib/date" // Use renamed utils
import { fmtUBtc, uBtcToUsd, fmtMoney } from "@/lib/num" // Use renamed utils
import { useToast } from "@/hooks/use-toast"
import { getDoneGames } from "@/actions/games" // Use action
import { getBtcUsd } from "@/services/btc" // Use service action
import type { Game } from "@/types/db"

const PAGE_SIZE = 15 // Reduced page size

export function GamesTable() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, startLoading] = useTransition() // Use transition for loading state
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const { toast } = useToast()

  // Fetch data function
  const fetchData = useCallback(async (pageNum = 0) => {
    startLoading(async () => {
      try {
        const [gamesRes, price] = await Promise.all([
          getDoneGames(pageNum, PAGE_SIZE),
          getBtcUsd(),
        ])

        if (gamesRes.error) throw new Error(gamesRes.error)
        // Auth check is implicitly done by the action

        setGames(gamesRes.data || [])
        setTotal(gamesRes.count || 0)
        setBtcPrice(price)
        setPage(pageNum) // Update page state after successful fetch
      } catch (error: any) {
        console.error("Fetch history error:", error)
        toast({ title: "Error", description: error.message || "Failed to fetch history.", variant: "destructive" })
        setGames([]) // Clear data on error
        setTotal(0)
      }
    })
  }, [toast]) // Dependencies

  // Initial fetch
  useEffect(() => {
    fetchData(0)
  }, [fetchData])

  // --- Render Logic ---
  const profitClass = (p: number) => (p >= 0 ? "text-green-600" : "text-red-600")

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center p- border-b">
        <h2 className="text-xl font-semibold m-4">History</h2>
        <Button variant="outline" size="icon" onClick={() => fetchData(page)} disabled={loading} className="h-8 w-8"> {/* Icon button */}
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && games.length === 0 && (
        <CardContent className="p- animate-pulse">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded"></div>)}
          </div>
        </CardContent>
      )}

      {/* No Games Message */}
      {!loading && games.length === 0 && (
        <CardContent className="p-6 text-center text-muted-foreground">No history found.</CardContent>
      )}

      {/* Games Table */}
      {!loading && games.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>End</TableHead> {/* Shortened */}
                  <TableHead>Type</TableHead>
                  <TableHead>BuyIn</TableHead>
                  <TableHead>Hrs</TableHead> {/* Shortened */}
                  <TableHead className="text-right">P/L (µ)</TableHead> {/* Shortened */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((g) => {
                  // Ensure end_stack and start_stack are numbers before subtraction
                  const profit = (g.end_stack ?? 0) - (g.start_stack ?? 0)
                  // Ensure end_time is valid before calculating duration
                  const duration = g.end_time ? hrsDiff(g.start_time, g.end_time) : 0
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="text-xs">{g.end_time ? fmtDt(g.end_time) : "-"}</TableCell> {/* Use fmtDt */}
                      <TableCell className="capitalize text-xs">{g.game_type}</TableCell>
                      <TableCell className="text-xs">{fmtUBtc(g.buy_in)}</TableCell>
                      <TableCell className="text-xs">{duration.toFixed(1)}</TableCell> {/* Shorter duration */}
                      <TableCell className="text-right text-xs">
                        <span className={profitClass(profit)}>{fmtUBtc(profit)}</span>
                        <div className="text-[10px] text-muted-foreground">{fmtMoney(uBtcToUsd(profit, btcPrice))}</div> {/* Smaller USD */}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {/* Pagination (Basic Example) */}
          <div className="flex items-center justify-between p-2 border-t">
             <span className="text-xs text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)} ({total} games)
             </span>
             <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => fetchData(page - 1)} disabled={page === 0 || loading}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => fetchData(page + 1)} disabled={page + 1 >= Math.ceil(total / PAGE_SIZE) || loading}>Next</Button>
             </div>
          </div>
        </>
      )}
    </Card>
  )
}