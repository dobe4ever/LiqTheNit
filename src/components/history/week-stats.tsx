// components/history/week-stats.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney, formatUBTC, convertUBTCtoUSD } from "@/lib/utils/number-formatter"
import { getStartOfWeek, getHoursDifference } from "@/lib/utils/date-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"

// Define the type for the game data fetched specifically in this component
interface WeeklyGameStats {
  start_time: string | null
  end_time: string | null
  start_stack: number | null
  end_stack: number | null
}

export function WeekStats() {
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalHours: 0,
    profitPerHour: 0,
  })
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
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

      const startOfWeek = getStartOfWeek().toISOString()

      const [gamesResponse, priceResponse] = await Promise.all([
        supabase
          .from("games")
          .select("start_time, end_time, start_stack, end_stack") // Select only needed fields
          .eq("user_id", userData.user.id)
          .gte("end_time", startOfWeek) // Filter by end_time being in the current week
          .not("end_time", "is", null)
          .not("end_stack", "is", null),
        getBitcoinPriceInUSD(),
      ])

      // Explicitly type the response data
      const games: WeeklyGameStats[] = gamesResponse.data || []

      if (gamesResponse.error) throw gamesResponse.error

      let totalProfit = 0
      let totalHours = 0

      // Add type annotation for 'game' parameter
      games.forEach((game: WeeklyGameStats) => {
        // Calculate profit (end_stack - start_stack)
        // Add null checks for safety
        const profit = (game.end_stack ?? 0) - (game.start_stack ?? 0)
        totalProfit += profit

        // Calculate hours played using the utility function
        if (game.start_time && game.end_time) {
          totalHours += getHoursDifference(game.start_time, game.end_time)
        }
      })

      const profitPerHour = totalHours > 0 ? totalProfit / totalHours : 0

      setStats({
        totalProfit,
        totalHours: Math.round(totalHours * 100) / 100,
        profitPerHour: Math.round(profitPerHour * 100) / 100,
      })

      setBtcPrice(priceResponse)
    } catch (error: any) {
      console.error("Error fetching week stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch weekly statistics.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast, supabase]) // Dependencies for useCallback

  // --- useEffect calls fetchData ---
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Render Logic ---
  return (
    <>
      <div className="flex justify-between mb-2">
        <h2 className="text-xl font-semibold">This Week So Far</h2>
        {/* --- Refresh Button --- */}
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-6 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Profit */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Profit</CardDescription>
              <CardTitle className={stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                {formatUBTC(stats.totalProfit)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatMoney(convertUBTCtoUSD(stats.totalProfit, btcPrice))}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Hours */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Hours</CardDescription>
              <CardTitle>{stats.totalHours.toFixed(2)} hr</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          {/* Card 3: Profit/Hour */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profit Per Hour</CardDescription>
              <CardTitle className={stats.profitPerHour >= 0 ? "text-green-600" : "text-red-600"}>
                {formatUBTC(stats.profitPerHour)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatMoney(convertUBTCtoUSD(stats.profitPerHour, btcPrice))}/hr
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}