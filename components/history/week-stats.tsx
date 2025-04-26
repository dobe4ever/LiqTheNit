"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney, formatUBTC, convertUBTCtoUSD } from "@/lib/utils/number-formatter"
import { getStartOfWeek } from "@/lib/utils/date-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"

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

  useEffect(() => {
    const fetchWeekStats = async () => {
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
            .select("*")
            .eq("user_id", userData.user.id)
            .gte("start_time", startOfWeek)
            .not("end_time", "is", null)
            .not("end_stack", "is", null),
          getBitcoinPriceInUSD(),
        ])

        if (gamesResponse.error) throw gamesResponse.error

        const games = gamesResponse.data || []
        let totalProfit = 0
        let totalHours = 0

        games.forEach((game) => {
          // Calculate profit (end_stack - start_stack)
          const profit = (game.end_stack || 0) - game.start_stack
          totalProfit += profit

          // Calculate hours played
          if (game.start_time && game.end_time) {
            const startTime = new Date(game.start_time).getTime()
            const endTime = new Date(game.end_time).getTime()
            const hoursPlayed = (endTime - startTime) / (1000 * 60 * 60)
            totalHours += hoursPlayed
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
    }

    fetchWeekStats()
  }, [router, toast, supabase])

  if (loading) {
    return (
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
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Profit</CardDescription>
          <CardTitle className={stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
            {formatUBTC(stats.totalProfit)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{formatMoney(convertUBTCtoUSD(stats.totalProfit, btcPrice))}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Hours</CardDescription>
          <CardTitle>{stats.totalHours} hours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This week</p>
        </CardContent>
      </Card>

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
  )
}
