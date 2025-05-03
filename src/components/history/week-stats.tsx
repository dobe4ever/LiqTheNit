"use client"
import { useState, useEffect, useCallback, useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { fmtMoney, fmtUBtc, uBtcToUsd } from "@/lib/num" // Use renamed utils
import { startOfWeek, hrsDiff } from "@/lib/date" // Use renamed utils
import { useToast } from "@/hooks/use-toast"
import { getGamesPeriod } from "@/actions/games" // Use action
import { getBtcUsd } from "@/services/btc" // Use service action
import type { Game } from "@/types/db"

interface Stats { totalPnl: number; totalHrs: number; pnlPerHr: number }

export function WeekStats() {
  const [stats, setStats] = useState<Stats>({ totalPnl: 0, totalHrs: 0, pnlPerHr: 0 })
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, startLoading] = useTransition()
  const { toast } = useToast()

  // Calculate stats from games data
  const calcStats = useCallback((games: Game[]): Stats => {
    let totalPnl = 0
    let totalHrs = 0
    games.forEach((g) => {
      if (g.end_stack !== null && g.start_stack !== null) {
        totalPnl += g.end_stack - g.start_stack
      }
      if (g.start_time && g.end_time) {
        totalHrs += hrsDiff(g.start_time, g.end_time)
      }
    })
    const pnlPerHr = totalHrs > 0 ? totalPnl / totalHrs : 0
    return {
      totalPnl,
      totalHrs: Math.round(totalHrs * 10) / 10, // Round hours
      pnlPerHr: Math.round(pnlPerHr), // Round P/L per hour
    }
  }, [])

  // Fetch data function
  const fetchData = useCallback(async () => {
    startLoading(async () => {
      try {
        const start = startOfWeek().toISOString()
        const end = new Date().toISOString() // Now

        const [gamesRes, price] = await Promise.all([
          getGamesPeriod(start, end),
          getBtcUsd(),
        ])

        if (gamesRes.error) throw new Error(gamesRes.error)
        // Auth check is handled by action

        setStats(calcStats(gamesRes.data || []))
        setBtcPrice(price)
      } catch (error: any) {
        console.error("Fetch week stats error:", error)
        toast({ title: "Error", description: error.message || "Failed to fetch week stats.", variant: "destructive" })
        setStats({ totalPnl: 0, totalHrs: 0, pnlPerHr: 0 }) // Reset stats on error
      }
    })
  }, [toast, calcStats]) // Dependencies

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Render Logic ---
  const profitClass = (p: number) => (p >= 0 ? "text-green-600" : "text-red-600")

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">This Week So Far</h2>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="h-8 w-8"> {/* Icon button */}
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                <div className="h-6 bg-muted rounded w-28"></div>
              </CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-16"></div></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
          {/* Profit */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profit</CardDescription>
              <CardTitle className={profitClass(stats.totalPnl)}>{fmtUBtc(stats.totalPnl)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(stats.totalPnl, btcPrice))}</p></CardContent>
          </Card>
          {/* Hours */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Hours</CardDescription>
              <CardTitle>{stats.totalHrs.toFixed(1)} hr</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">This week</p></CardContent>
          </Card>
          {/* Profit/Hour */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>P/L Hour</CardDescription>
              <CardTitle className={profitClass(stats.pnlPerHr)}>{fmtUBtc(stats.pnlPerHr)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(stats.pnlPerHr, btcPrice))}/hr</p></CardContent>
          </Card>
        </div>
      )}
    </>
  )
}