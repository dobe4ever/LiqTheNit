// src/components/history/games-table.tsx
"use client"
import { useState, useEffect, useCallback, useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { fmtTime, fmtDateShort, fmtDurMins } from "@/lib/date"
import { fmtUBtc, uBtcToUsd, fmtMoney } from "@/lib/num"
import { useToast } from "@/hooks/use-toast"
import { getDoneGames } from "@/actions/games"
import { getBtcUsd } from "@/services/btc"
import type { Game } from "@/types/db"

const PAGE_SIZE = 15

export function GamesTable() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, startLoading] = useTransition()
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const { toast } = useToast()

  const fetchData = useCallback(async (pageNum = 0) => {
    startLoading(async () => {
      try {
        const [gamesRes, price] = await Promise.all([
          getDoneGames(pageNum, PAGE_SIZE),
          getBtcUsd(),
        ])

        if (gamesRes.error) throw new Error(gamesRes.error)

        setGames(gamesRes.data || [])
        setTotal(gamesRes.count || 0)
        setBtcPrice(price)
        setPage(pageNum)
      } catch (error: any) {
        console.error("Fetch history error:", error)
        toast({ title: "Error", description: error.message || "Failed to fetch history.", variant: "destructive" })
        setGames([])
        setTotal(0)
      }
    })
  }, [toast])

  useEffect(() => {
    fetchData(0)
  }, [fetchData])

  const profitClass = (p: number) => (p >= 0 ? "text-green-600" : "text-red-600")

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center border-b pb-2 mb-2">
        <h2 className="text-xl font-semibold m-0">History</h2>
        <Button variant="outline" size="icon" onClick={() => fetchData(page)} disabled={loading} className="h-8 w-8">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {loading && games.length === 0 && (
        <CardContent className="p-0 animate-pulse">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded"></div>)}
          </div>
        </CardContent>
      )}

      {!loading && games.length === 0 && (
        <CardContent className="p-6 text-center text-muted-foreground">No history found.</CardContent>
      )}

      {!loading && games.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>End</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>BuyIn</TableHead>
                  <TableHead>Dur</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((g) => {
                  const profit = (g.end_stack ?? 0) - (g.start_stack ?? 0)
                  const durationStr = g.end_time ? fmtDurMins(g.start_time, g.end_time) : "-"
                  const endTimeStr = g.end_time ? fmtTime(g.end_time) : "-"
                  const endDateStr = g.end_time ? fmtDateShort(g.end_time) : "-"

                  return (
                    // --- FIX: Ensure no whitespace between TableCells ---
                    <TableRow key={g.id}>
                      <TableCell className="text-xs leading-tight">
                        <div>{endTimeStr}</div>
                        <div className="text-muted-foreground">{endDateStr}</div>
                      </TableCell><TableCell> {/* <-- No space/newline */}
                        <Badge variant={g.game_type === 'progressive' ? 'default' : 'secondary'} className="capitalize text-xs">
                          {g.game_type.substring(0, 4)}
                        </Badge>
                      </TableCell><TableCell className="text-xs leading-tight"> {/* <-- No space/newline */}
                        <div>{fmtUBtc(g.buy_in)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtMoney(uBtcToUsd(g.buy_in, btcPrice))}</div>
                      </TableCell><TableCell className="text-xs">{durationStr}</TableCell><TableCell className="text-right text-xs leading-tight"> {/* <-- No space/newline */}
                        <div className={profitClass(profit)}>{fmtUBtc(profit)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtMoney(uBtcToUsd(profit, btcPrice))}</div>
                      </TableCell>
                    </TableRow>
                    // --- END FIX ---
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between p-2 border-t mt-2">
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