"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { getHoursDifference } from "@/lib/utils/date-formatter"

interface Game {
  id: string
  start_stack: number
  end_stack: number
  start_time: string
  end_time: string
}

type TimeframeOption = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL"

interface TimeframeConfig {
  days: number
  barInterval: "hour" | "day" | "week" | "month"
  barCount: number
}

const timeframeConfigs: Record<TimeframeOption, TimeframeConfig> = {
  "1D": { days: 1, barInterval: "hour", barCount: 24 },
  "7D": { days: 7, barInterval: "day", barCount: 7 },
  "1M": { days: 30, barInterval: "day", barCount: 30 },
  "3M": { days: 90, barInterval: "day", barCount: 90 },
  "6M": { days: 180, barInterval: "week", barCount: 26 },
  "1Y": { days: 365, barInterval: "week", barCount: 52 },
  "5Y": { days: 1825, barInterval: "month", barCount: 60 },
  ALL: { days: 3650, barInterval: "month", barCount: 120 },
}

export function PerformanceChart() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<TimeframeOption>("7D")
  const [activeMetric, setActiveMetric] = useState<"profit" | "hours">("profit")
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Calculate totals for the selected timeframe
  const totals = useMemo(() => {
    let totalProfit = 0
    let totalHours = 0

    games.forEach((game) => {
      if (game.end_stack !== null && game.start_stack !== null) {
        const profit = game.end_stack - game.start_stack
        totalProfit += profit
      }

      if (game.start_time && game.end_time) {
        const hours = getHoursDifference(game.start_time, game.end_time)
        totalHours += hours
      }
    })

    return {
      profit: totalProfit,
      hours: Math.round(totalHours * 100) / 100,
    }
  }, [games])

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/auth")
          return
        }

        // Calculate date range based on selected timeframe
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(endDate.getDate() - timeframeConfigs[timeframe].days)

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
          description: "Failed to fetch performance data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [timeframe, router, toast, supabase])

  // Generate chart data based on timeframe
  const chartData = useMemo(() => {
    const { barInterval, barCount } = timeframeConfigs[timeframe]
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - timeframeConfigs[timeframe].days)

    // Create a map of intervals in the selected timeframe
    const intervalsMap = new Map()

    // Initialize with all intervals in the range
    for (let i = 0; i < barCount; i++) {
      const intervalDate = new Date(startDate)
      let intervalKey: string

      if (barInterval === "hour") {
        intervalDate.setHours(intervalDate.getHours() + i)
        intervalKey = intervalDate.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      } else if (barInterval === "day") {
        intervalDate.setDate(intervalDate.getDate() + i)
        intervalKey = intervalDate.toISOString().slice(0, 10) // YYYY-MM-DD
      } else if (barInterval === "week") {
        intervalDate.setDate(intervalDate.getDate() + i * 7)
        // Use the start of the week as the key
        const dayOfWeek = intervalDate.getDay()
        const diff = intervalDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to get Monday
        intervalDate.setDate(diff)
        intervalKey = intervalDate.toISOString().slice(0, 10) // YYYY-MM-DD (Monday)
      } else {
        // month
        intervalDate.setMonth(intervalDate.getMonth() + i)
        intervalKey = intervalDate.toISOString().slice(0, 7) // YYYY-MM
      }

      if (intervalDate <= endDate) {
        intervalsMap.set(intervalKey, { date: intervalKey, profit: 0, hours: 0 })
      }
    }

    // Aggregate data by interval
    games.forEach((game) => {
      if (game.end_time) {
        let intervalKey: string
        const gameDate = new Date(game.end_time)

        if (barInterval === "hour") {
          intervalKey = game.end_time.slice(0, 13) // YYYY-MM-DDTHH
        } else if (barInterval === "day") {
          intervalKey = game.end_time.slice(0, 10) // YYYY-MM-DD
        } else if (barInterval === "week") {
          // Get the Monday of the week
          const dayOfWeek = gameDate.getDay()
          const diff = gameDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          const monday = new Date(gameDate)
          monday.setDate(diff)
          intervalKey = monday.toISOString().slice(0, 10) // YYYY-MM-DD (Monday)
        } else {
          // month
          intervalKey = game.end_time.slice(0, 7) // YYYY-MM
        }

        if (intervalsMap.has(intervalKey)) {
          const interval = intervalsMap.get(intervalKey)

          // Calculate profit
          if (game.end_stack !== null && game.start_stack !== null) {
            const profit = game.end_stack - game.start_stack
            interval.profit += profit
          }

          // Calculate hours
          if (game.start_time && game.end_time) {
            const hours = getHoursDifference(game.start_time, game.end_time)
            interval.hours += hours
          }

          intervalsMap.set(intervalKey, interval)
        }
      }
    })

    // Convert map to array and sort by date
    return Array.from(intervalsMap.values()).sort((a, b) => {
      return a.date.localeCompare(b.date)
    })
  }, [games, timeframe])

  const chartConfig = {
    profit: {
      label: "Profit/Loss",
      color: "hsl(var(--chart-1))",
    },
    hours: {
      label: "Hours Played",
      color: "hsl(var(--chart-2))",
    },
  }

  const formatDate = (date: string) => {
    const { barInterval } = timeframeConfigs[timeframe]
    const dateObj = new Date(date)

    if (barInterval === "hour") {
      return dateObj.toLocaleTimeString("en-US", { hour: "numeric" })
    } else if (barInterval === "day") {
      return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } else if (barInterval === "week") {
      return `${dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    } else {
      // month
      return dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
  }

  if (loading && chartData.length === 0) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
          <div className="h-24 bg-muted rounded-t sm:rounded-tr-none sm:rounded-l w-full"></div>
        </CardHeader>
        <CardContent className="h-[300px] bg-muted rounded-b sm:rounded-bl-none"></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Performance Chart</CardTitle>
          <CardDescription>
            Showing {activeMetric === "profit" ? "profit/loss" : "hours played"} for the selected period
          </CardDescription>
        </div>
        <div className="flex">
          {(["profit", "hours"] as const).map((metric) => (
            <button
              key={metric}
              data-active={activeMetric === metric}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
              onClick={() => setActiveMetric(metric)}
            >
              <span className="text-xs text-muted-foreground">{chartConfig[metric].label}</span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {metric === "profit" ? (
                  <>
                    <span className={totals.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatUBTC(totals.profit)}
                    </span>
                    <div className="text-xs font-normal text-muted-foreground">
                      {formatMoney(convertUBTCtoUSD(totals.profit, btcPrice))}
                    </div>
                  </>
                ) : (
                  `${totals.hours} hrs`
                )}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="flex justify-center border-b p-2">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(timeframeConfigs) as TimeframeOption[]).map((option) => (
            <Button
              key={option}
              variant={timeframe === option ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(option)}
              className="px-3 py-1 h-8"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <CardContent className="px-2 pt-6 pb-2 sm:p-6">
        <ChartContainer config={chartConfig} className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={formatDate}
                />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      formatter={(value: number) => {
                        if (activeMetric === "profit") {
                          return [formatUBTC(value), formatMoney(convertUBTCtoUSD(value, btcPrice))]
                        } else {
                          return [`${value.toFixed(1)} hours`]
                        }
                      }}
                      labelFormatter={(value) => {
                        return formatDate(value)
                      }}
                    />
                  }
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                />
                <Bar
                  dataKey={activeMetric}
                  fill={`var(--color-${activeMetric})`}
                  radius={[4, 4, 0, 0]}
                  name={chartConfig[activeMetric].label}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}