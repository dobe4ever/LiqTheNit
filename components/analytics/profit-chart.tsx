"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { gamesTable } from "@/app/supabase/tables"

export function ProfitChart() {
  const [games, setGames] = useState<gamesTable[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7")
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

        // Calculate date range based on selected period
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(endDate.getDate() - Number.parseInt(period))

        const [gamesResponse, priceResponse] = await Promise.all([
          supabase
            .from("games")
            .select("id, start_stack, end_stack, start_time, end_time")
            .eq("user_id", userData.user.id)
            .gte("end_time", startDate.toISOString())
            .lte("end_time", endDate.toISOString())
            .not("end_time", "is", null)
            .not("end_stack", "is", null)
            .order("end_time", { ascending: true }),
          getBitcoinPriceInUSD(),
        ])

        if (gamesResponse.error) throw gamesResponse.error

        setGames(gamesResponse.data || [])
        setBtcPrice(priceResponse)
      } catch (error: any) {
        console.error("Error fetching games for chart:", error)
        toast({
          title: "Error",
          description: "Failed to fetch profit data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [period, router, toast, supabase])

  // Generate daily profit data
  const chartData = useMemo(() => {
    // Create a map of dates in the selected period
    const datesMap = new Map()
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - Number.parseInt(period))

    // Initialize with all dates in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0]
      datesMap.set(dateKey, { date: dateKey, profit: 0 })
    }

    // Aggregate profits by date
    games.forEach((game) => {
      if (game.end_time && game.end_stack !== null && game.start_stack !== null) {
        const dateKey = game.end_time.split("T")[0]
        const profit = game.end_stack - game.start_stack

        if (datesMap.has(dateKey)) {
          const day = datesMap.get(dateKey)
          day.profit += profit
          datesMap.set(dateKey, day)
        }
      }
    })

    // Convert map to array
    return Array.from(datesMap.values())
  }, [games, period])

  const chartConfig = {
    profit: {
      label: "Profit/Loss",
      color: "hsl(var(--chart-1))",
    },
  }

  if (loading && chartData.length === 0) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </CardHeader>
        <CardContent className="h-[300px] bg-muted rounded"></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Profits</CardTitle>
        <CardDescription>View your profit trends over time</CardDescription>
        <Tabs value={period} onValueChange={setPeriod} className="mt-2">
          <TabsList>
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
            <TabsTrigger value="180">180 Days</TabsTrigger>
            <TabsTrigger value="365">365 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}`} />
                <Bar dataKey="profit" fill="var(--color-profit)" radius={[4, 4, 0, 0]} name="Profit/Loss" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => [formatUBTC(value), formatMoney(convertUBTCtoUSD(value, btcPrice))]}
                    />
                  }
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}