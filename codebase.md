# Codebase Dump

### app/(app)/analytics/page.tsx
```ts
import { PerformanceChart } from "@/components/analytics/performance-chart"
import { ProfitChart } from "@/components/analytics/profit-chart"
import { HoursChart } from "@/components/analytics/hours-chart"

export default function AnalyticsPage() {
  return (
    // Main wrapper
    <div className="flex flex-col pb-10 sm:flex-row justify-between gap-4">

      {/* Row 1: Title + subline */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your performance over time</p>
      </div>

      {/* Row 2: Performance chart */}
      <PerformanceChart />

      {/* Row 3: Profits chart */}
      <ProfitChart />

      {/* Row 4: Time played chart */}
      <HoursChart />
    </div>
  )
}
```

### app/(app)/history/page.tsx
```ts
import { WeekStats } from "@/components/history/week-stats"
import { GamesTable } from "@/components/history/games-table"

export default function HistoryPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    // Main wrapper
    <div className="flex flex-col pb-10 sm:flex-row justify-between gap-4 w-">

      {/* Row 1: Title + subline */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {/* Row 2: Weekly stats */}
      <WeekStats />

      {/* Row 3: history of games table */}
      <GamesTable />

    </div>
  )
}
```

### app/(app)/layout.tsx
```ts
import type React from "react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = getSupabaseServerClient()
  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/auth")
  }

  // Use upsert operation to handle the case where the profile might already exist
  // This will update the profile if it exists, or create it if it doesn't
  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: data.user.id,
      username: data.user.email?.split("@")[0] || "user",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id", // Specify the conflict target
      ignoreDuplicates: false, // Update the row if it already exists
    },
  )

  if (upsertError) {
    console.error("Error upserting profile:", upsertError)
  }

  return (
    <div className="flex min-h-screen flex-col m-2">
      <div>
        <Navbar />
      </div>
      <main className="flex-1 p-2 md:p-6 mt-0 sm:mt-0">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
```

### app/(app)/page.tsx
```ts
import { SessionController } from "@/components/start/session-controller"
import { GameForm } from "@/components/start/game-form"
import { ActiveGamesList } from "@/components/start/active-games-list"

export default async function StartPage() {
  return (
    // Main wrapper
    <div className="flex flex-col pb-10 sm:flex-row justify-between gap-4 w-">
        
      {/* Row 1: Title + subline */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start</h1>
        <p className="text-muted-foreground">Start a session and track your games</p>
      </div>

      {/* Row 2: session controller */}
      <SessionController />

      {/* Row 3: Game form */}
      <GameForm />

      {/* Row 4: Active games */}
      <ActiveGamesList />

    </div>
  )
}

```

### app/(auth)/auth/callback/route.ts
```ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
}
```

### app/(auth)/auth/page.tsx
```ts
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function AuthPage() {
  const supabase = getSupabaseServerClient()

  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <AuthForm />
    </div>
  )
}
```

### app/layout.tsx
```ts
import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "LiqTheNit - Poker Progress Tracker",
  description: "Track your OFC poker progress with LiqTheNit",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={poppins.className} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### components/analytics/hours-chart.tsx
```ts
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getHoursDifference } from "@/lib/utils/date-formatter"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { gamesTable } from "@/lib/supabase/tables"

export function HoursChart() {
  const [games, setGames] = useState<gamesTable[]>([])
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

        const { data, error } = await supabase
          .from("games")
          .select("id, start_time, end_time")
          .eq("user_id", userData.user.id)
          .gte("end_time", startDate.toISOString())
          .lte("end_time", endDate.toISOString())
          .not("end_time", "is", null)
          .order("end_time", { ascending: true })

        if (error) throw error

        setGames(data || [])
      } catch (error: any) {
        console.error("Error fetching games for hours chart:", error)
        toast({
          title: "Error",
          description: "Failed to fetch hours data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [period, router, toast, supabase])

  // Generate daily hours data
  const chartData = useMemo(() => {
    // Create a map of dates in the selected period
    const datesMap = new Map()
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - Number.parseInt(period))

    // Initialize with all dates in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0]
      datesMap.set(dateKey, { date: dateKey, hours: 0 })
    }

    // Aggregate hours by date
    games.forEach((game) => {
      if (game.start_time && game.end_time) {
        const dateKey = game.end_time.split("T")[0]
        const hours = getHoursDifference(game.start_time, game.end_time)

        if (datesMap.has(dateKey)) {
          const day = datesMap.get(dateKey)
          day.hours += hours
          datesMap.set(dateKey, day)
        }
      }
    })

    // Convert map to array
    return Array.from(datesMap.values())
  }, [games, period])

  const chartConfig = {
    hours: {
      label: "Hours Played",
      color: "hsl(var(--chart-2))",
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
        <CardTitle>Daily Hours Played</CardTitle>
        <CardDescription>Track your play time over time</CardDescription>
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
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value.toFixed(1)}`} />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} name="Hours Played" />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value: number) => [`${value.toFixed(1)} hours`]} />}
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
```

### components/analytics/performance-chart.tsx
```ts
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
import { gamesTable } from "@/lib/supabase/tables"

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
  const [games, setGames] = useState<gamesTable[]>([])
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
```

### components/analytics/profit-chart.tsx
```ts
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { gamesTable } from "@/lib/supabase/tables"

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
```

### components/auth/auth-form.tsx
```ts
"use client"

import type React from "react"
import { LogoSymbol } from "@/components/logo-symbol"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Success!",
        description: "You have been signed in.",
      })

      router.refresh()
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      toast({
        title: "Success!",
        description: "Check your email for the confirmation link.",
      })
    } catch (error: any) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-col items-center">
        <div>
          <LogoSymbol className="h-12 w-9" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          NIT
        </CardTitle>
        <CardDescription className="text-center">
          Track your OFC poker progress
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="mx-6 grid w- grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
```

### components/history/bitcoin-price-display.tsx
```ts
"use client"

import { useEffect, useState } from "react"
import { formatMoney } from "@/lib/utils/number-formatter"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"

export function BitcoinPriceDisplay() {
  const [price, setPrice] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchPrice = async () => {
      setLoading(true)
      try {
        const btcPrice = await getBitcoinPriceInUSD()
        setPrice(btcPrice)
      } catch (error) {
        console.error("Error fetching Bitcoin price:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-md h-6 w-32"></div>
  }

  return (
    <div className="flex items-center gap-2 font-medium">
      <div className="flex items-center">
        <span className="text-yellow-500 mr-1">₿</span>
        <span>{formatMoney(price)}</span>
      </div>
    </div>
  )
}
```

### components/history/games-table.tsx
```ts
// components/history/games-table.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime, getHoursDifference } from "@/lib/utils/date-formatter"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { gamesTable } from "@/lib/supabase/tables"

export function GamesTable() {
  const [games, setGames] = useState<gamesTable[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalGames, setTotalGames] = useState(0)
  const pageSize = 25
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

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
    } 
    catch (error: any) {
      console.error("Error fetching games:", error)
      toast({
        title: "Error",
        description: "Failed to fetch games history.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [page, router, toast, supabase])
  
  useEffect(() => {
    fetchData()
  }, [page, fetchData])
  
  return (
    <Card>
      <div className="flex justify-between p-2 border-b">
      <h2 className="text-xl font-semibold">Game History</h2>
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
        </>
      )}
    </Card>
  )
}
```

### components/history/week-stats.tsx
```ts
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
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
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
```

### components/layout/navbar.tsx
```ts
// components/layout/navbar.tsx

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { NavUser } from "@/components/nav-user"
import { LogoSymbol } from "@/components/logo-symbol"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js" // Import User type

const navItems = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  // { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<User | null>(null) // State for user data
  const [loadingUser, setLoadingUser] = useState(true)

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error) {
        console.error("Error fetching user:", error)
        toast({ title: "Error fetching user", description: error.message, variant: "destructive" })
      }
      setUser(user)
      setLoadingUser(false)
    }
    fetchUser()
  }, [supabase, toast])

  const handleSignOut = async () => {
    setLoadingUser(true) // Show loading state while signing out
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast({
        title: "Success!",
        description: "You have been signed out.",
      })
      setUser(null) // Clear user state
      router.push("/auth") // Redirect immediately
      router.refresh() // Ensure layout re-render if needed
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
      setLoadingUser(false) // Reset loading state on error
    }
    // setLoadingUser(false) // This line might be unreachable after push
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      {/* Adjusted padding: p-1 for mobile, sm:py-2 for desktop */}
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* 1. Logo (Desktop only) */}
        <div className="flex items-center justify-left pl-2">
          <div className="hidden sm:flex">
            <LogoSymbol className="h-9 w-7.5 text-primary mr-1.5" />
          </div>
          <div className="hidden sm:flex">
            <Link href="/" className="text-3xl font-bold">
              NIT
            </Link>
          </div>
        </div>

        {/* 2. Desktop Navigation (Desktop only) */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-x-1.5" // Add gap between icon and text
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
          {/* Desktop User Menu Trigger */}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loadingUser} />
        </div>

        {/* 3. Mobile Navigation (Mobile only) */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-primary" // Active mobile style (adjust as needed)
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="mb-0.5 h-5 w-5" /> {/* Slightly smaller icon, margin bottom */}
                <span>{item.label}</span>
              </Link>
            )
          })}
          {/* Mobile User Menu Trigger */}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loadingUser} />
        </div>
      </div>
    </nav>
  )
}
```

### components/layout/switch-theme.tsx
```ts
// components/layout/switch-theme.tsx
"use client"

import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils" // Make sure you have this utility or adapt

export function SwitchTheme() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    // Outer flex container remains the same
    <div className="flex w-full items-center justify-between">
      <Label htmlFor="theme-switch" className="pr-2 text-foreground cursor-default">
        Theme
      </Label>

      {/* --- Switch and Icon Container --- */}
      {/* Make this container relative to position icons absolutely within it */}
      {/* Needs explicit width to contain the switch + icon positioning */}
      <div className="relative flex items-center w-[46px]"> {/* Adjust width as needed */}
        {/* The Switch Component - Base Layer */}
        <Switch
          id="theme-switch"
          checked={isDark}
          onCheckedChange={toggleTheme}
          className="cursor-pointer w-full" // Make switch fill the container width
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        />

        {/* --- Absolutely Positioned Icons Layer --- */}
        {/* This div sits ON TOP of the switch visually */}
        {/* pointer-events-none allows clicks to pass through to the Switch */}
        <div className="absolute inset-0 flex items-center justify-between px-[4.5px] pointer-events-none">
          {/* Sun Icon (Left side) */}
          <Sun
            className={cn(
              "h-3.5 w-3.5 transition-colors", // Adjust size if needed
              isDark ? "text-black" : "text-yellow-500" // Active when light
            )}
          />
          {/* Moon Icon (Right side) */}
          <Moon
            className={cn(
              "h-3.5 w-3.5 transition-colors", // Adjust size if needed
              isDark ? "text-yellow-400" : "text-muted-foreground/60" // Active when dark
            )}
          />
        </div>
      </div>
    </div>
  )
}
```

### components/start/active-games-list.tsx
```ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
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
  session_id: string // Keep session_id if needed elsewhere, though not used in fetch logic now
}

// Removed sessionId prop
export function ActiveGamesList() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [listLoading, setListLoading] = useState(true) // Separate loading for the list
  const [endingGame, setEndingGame] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Fetch active session ID
  const fetchActiveSession = useCallback(async () => {
    setSessionLoading(true)
    setActiveSessionId(null) // Reset session ID before fetching
    setGames([]) // Clear games when session might change
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setSessionLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", userData.user.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .maybeSingle()

      if (error) throw error

      setActiveSessionId(data?.id ?? null)
    } catch (error: any) {
      console.error("Error fetching active session for games list:", error)
      toast({ title: "Error", description: "Could not determine active session.", variant: "destructive" })
      setActiveSessionId(null)
    } finally {
      setSessionLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchActiveSession()
    // Add listener for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      fetchActiveSession()
    })
    return () => {
      subscription?.unsubscribe()
    }
  }, [fetchActiveSession]) // Depend on the memoized function

  // Fetch active games based on the activeSessionId
  const fetchData = useCallback(async () => {
    if (!activeSessionId) {
      setGames([]) // Ensure games are cleared if no session ID
      setListLoading(false)
      return
    }

    setListLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth") // Should be handled by layout/session fetch, but belt-and-suspenders
        return
      }

      const [gamesResponse, priceResponse] = await Promise.all([
        supabase
          .from("games")
          .select("*")
          .eq("session_id", activeSessionId) // Use the fetched activeSessionId
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
      toast({ title: "Error", description: "Failed to fetch active games.", variant: "destructive" })
      setGames([]) // Clear games on error
    } finally {
      setListLoading(false)
    }
    // Removed sessionId dependency, added activeSessionId
  }, [activeSessionId, router, toast, supabase])

  // useEffect calls fetchData when activeSessionId changes
  useEffect(() => {
    fetchData()
  }, [activeSessionId, fetchData]) // Now depends on activeSessionId

  const handleEndGame = (gameId: string) => {
    setEndingGame(gameId)
    const game = games.find((g) => g.id === gameId)
    if (game) {
      setEndStack(game.start_stack.toString())
    }
  }

  const submitEndGame = async (gameId: string) => {
    if (!endStack) {
      toast({ title: "Error", description: "Please enter an ending stack value.", variant: "destructive" })
      return
    }

    setListLoading(true) // Indicate loading during submission
    try {
      const { error } = await supabase
        .from("games")
        .update({
          end_stack: Number.parseInt(endStack),
          end_time: new Date().toISOString(),
        })
        .eq("id", gameId)

      if (error) throw error

      toast({ title: "Success", description: "Game ended successfully." })
      setEndingGame(null)
      setEndStack("")
      fetchData() // Re-fetch data after ending game
      router.refresh() // Still good to refresh for other potential updates on the page
    } catch (error: any) {
      console.error("Error ending game:", error)
      toast({ title: "Error", description: "Failed to end game.", variant: "destructive" })
    } finally {
      // Ensure loading state is reset even if fetchData is called
      // Note: listLoading might be immediately set to true by fetchData,
      // but we ensure it's false if the submit logic finishes first.
      setListLoading(false)
    }
  }

  const cancelEndGame = () => {
    setEndingGame(null)
    setEndStack("")
  }

  // Combined loading state
  const isLoading = sessionLoading || listLoading

  // Render initial loading state
  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  // Render message if no active session
  if (!activeSessionId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active session. Start a session to see active games.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render active games list
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Current Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {listLoading && games.length === 0 && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      )}

      {!listLoading && games.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active games in this session. Start a new game to see it here.
          </CardContent>
        </Card>
      )}

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
                      {getHoursDifference(game.start_time, new Date().toISOString()).toFixed(2)} hours
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
                        disabled={listLoading} // Disable input while submitting
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEndGame(game.id)} className="flex-1" disabled={listLoading}>
                        {listLoading ? "Confirming..." : "Confirm"}
                      </Button>
                      <Button onClick={cancelEndGame} variant="outline" className="flex-1" disabled={listLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              {!isEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndGame(game.id)} variant="default" className="w-full" disabled={listLoading}>
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
```

### components/start/game-form.tsx
```ts
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Removed sessionId from props
export function GameForm() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [formLoading, setFormLoading] = useState(false) // Renamed loading state
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Fetch active session ID
  useEffect(() => {
    const fetchActiveSession = async () => {
      setSessionLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          // No need to push to /auth, layout should handle this
          setSessionLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", userData.user.id)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .maybeSingle()

        if (error) throw error

        setActiveSessionId(data?.id ?? null)
      } catch (error: any) {
        console.error("Error fetching active session for game form:", error)
        toast({
          title: "Error",
          description: "Could not determine active session.",
          variant: "destructive",
        })
        setActiveSessionId(null)
      } finally {
        setSessionLoading(false)
      }
    }

    fetchActiveSession()
    // Add listener for auth changes which might affect session status indirectly
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      // Re-fetch session when auth state changes (e.g., logout)
      fetchActiveSession()
    })

    // Cleanup listener on component unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSessionId) {
      toast({ title: "Error", description: "No active session found.", variant: "destructive" })
      return
    }
    if (!startStack) {
      toast({ title: "Error", description: "Please enter a starting stack value.", variant: "destructive" })
      return
    }

    setFormLoading(true) // Use formLoading state

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth") // Redirect if user somehow lost auth
        return
      }

      const { error } = await supabase.from("games").insert([
        {
          session_id: activeSessionId, // Use fetched session ID
          user_id: userData.user.id,
          game_type: gameType,
          buy_in: Number.parseInt(buyIn),
          start_stack: Number.parseInt(startStack),
          start_time: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast({ title: "Success", description: "Game started successfully." })
      setStartStack("")
      router.refresh() // Refresh page to update ActiveGamesList
    } catch (error: any) {
      console.error("Error starting game:", error)
      toast({ title: "Error", description: "Failed to start game.", variant: "destructive" })
    } finally {
      setFormLoading(false) // Use formLoading state
    }
  }

  // Render loading state or message if no active session
  if (sessionLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </CardContent>
        <CardFooter>
          <div className="h-10 bg-muted rounded w-full"></div>
        </CardFooter>
      </Card>
    )
  }

  if (!activeSessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Start a session to add new games.</p>
        </CardContent>
      </Card>
    )
  }

  // Render the form if session is active
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Game</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-type">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType} disabled={formLoading}>
              <SelectTrigger id="game-type">
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µBTC)</Label>
            <Select value={buyIn} onValueChange={setBuyIn} disabled={formLoading}>
              <SelectTrigger id="buy-in">
                <SelectValue placeholder="Select buy in amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 µBTC</SelectItem>
                <SelectItem value="100">100 µBTC</SelectItem>
                <SelectItem value="200">200 µBTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-stack">Starting Stack (µBTC)</Label>
            <Input
              id="start-stack"
              type="number"
              value={startStack}
              onChange={(e) => setStartStack(e.target.value)}
              placeholder="Enter starting stack"
              disabled={formLoading}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={formLoading}>
            {formLoading ? "Starting..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

### components/start/session-controller.tsx
```ts
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils/date-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Session {
  id: string
  start_time: string
  end_time: string | null
}

export function SessionController() {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchActiveSession = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/auth")
          return
        }

        // Now fetch the active session
        const { data, error } = await supabase
          .from("sessions")
          .select("id, start_time, end_time")
          .eq("user_id", userData.user.id)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .limit(1)

        if (error) {
          throw error
        }

        setActiveSession(data && data.length > 0 ? data[0] : null)
      } catch (error: any) {
        console.error("Error fetching active session:", error)
        toast({
          title: "Error",
          description: "Failed to fetch active session: " + error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchActiveSession()
  }, [router, toast, supabase])

  const toggleSession = async (checked: boolean) => {
    if (checked) {
      // Start session
      await startSession()
    } else {
      // End session
      await endSession()
    }
  }

  const startSession = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth")
        return
      }

      // Create session
      const { data, error } = await supabase
        .from("sessions")
        .insert([{ user_id: userData.user.id }])
        .select()

      if (error) {
        throw new Error("Failed to create session: " + error.message)
      }

      setActiveSession(data && data.length > 0 ? data[0] : null)
      toast({
        title: "Success",
        description: "Session started successfully.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error starting session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start session.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", activeSession.id)

      if (error) throw error

      setActiveSession(null)
      toast({
        title: "Success",
        description: "Session ended successfully.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error ending session:", error)
      toast({
        title: "Error",
        description: "Failed to end session.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center space-x-2">
        <Switch id="session-toggle" checked={!!activeSession} onCheckedChange={toggleSession} disabled={loading} />
        <Label htmlFor="session-toggle" className="cursor-pointer">
          {activeSession ? "Session Active" : "Session Inactive"}
        </Label>
      </div>

      {activeSession && (
        <div className="text-sm">
          <span className="text-muted-foreground">Since: </span>
          <span className="font-medium">{formatDateTime(activeSession.start_time)}</span>
        </div>
      )}
    </div>
  )
}
```

### components/nav-user.tsx
```ts
// components/nav-user.tsx

"use client"

import { Moon, Sun, LogOut, User as UserIcon, Loader2 } from "lucide-react"
// No longer need useTheme here
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"
import { SwitchTheme } from "./layout/switch-theme" // Import the new component

// Function to get initials from email (keep existing)
function getInitials(email: string | undefined): string {
  if (!email) return "?"
  const parts = email.split("@")[0]
  const nameParts = parts.split(/[._-]/) // Split by common separators
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
  } else if (parts.length > 1) {
    return (parts[0] + parts[1]).toUpperCase()
  } else if (parts.length === 1 && parts[0]) {
    return parts[0][0].toUpperCase()
  }
  return email[0]?.toUpperCase() ?? "?"
}

export function NavUser({
  user,
  onSignOut,
  isLoading,
}: {
  user: User | null
  onSignOut: () => Promise<void>
  isLoading: boolean
}) {
  // useTheme hook is now inside SwitchTheme component

  const triggerContent = isLoading ? (
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  ) : (
    <Avatar className="h-8 w-8">
      <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
    </Avatar>
  )

  if (!user && !isLoading) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          {triggerContent}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || user?.email?.split("@")[0]}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Preferences Label */}
          <DropdownMenuLabel className="text-muted-foreground">
            Preferences
          </DropdownMenuLabel>

          {/* --- Theme Toggle Section --- */}
          {/* Wrap SwitchTheme in a DropdownMenuItem */}
          {/* Prevent default selection behavior to keep menu open */}
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="cursor-default focus:bg-transparent" // Make item non-interactive visually
          >
            {/* Render the SwitchTheme component */}
            <SwitchTheme />
          </DropdownMenuItem>
          {/* --- End Theme Toggle Section --- */}

        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Sign Out Item */}
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer"> {/* Ensure sign out is clickable */}
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### components/theme-provider.tsx
```ts
'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### lib/services/bitcoin-price.ts
```ts
"use server"

export async function getBitcoinPriceInUSD(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { next: { revalidate: 300 } }, // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Bitcoin price: ${response.status}`)
    }

    const data = await response.json()
    return data.bitcoin.usd
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error)
    return 0 // Return 0 as fallback
  }
}

```

### lib/supabase/admin.ts
```ts
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with the service role key that can bypass RLS
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

### lib/supabase/client.ts
```ts
"use client"

import { createBrowserClient } from "@supabase/ssr"

// Create a single instance of the Supabase client to be used throughout the app
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabaseClient
}
```

### lib/supabase/server.ts
```ts
// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function getSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions): void {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
          }
        },
        remove(name: string, options: CookieOptions): void {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
          }
        },
      },
    }
  )
}
```

### lib/utils/date-formatter.ts
```ts
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - d.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function getHoursDifference(start: Date | string, end: Date | string): number {
  const startDate = typeof start === "string" ? new Date(start) : start
  const endDate = typeof end === "string" ? new Date(end) : end

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.round((diffTime / (1000 * 60 * 60)) * 100) / 100
}

export function getStartOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() || 7 // Convert Sunday from 0 to 7
  if (day !== 1) {
    // If it's not Monday
    now.setHours(-24 * (day - 1)) // Set to previous Monday
  }
  now.setHours(0, 0, 0, 0) // Set to start of day
  return now
}
```

### lib/utils/number-formatter.ts
```ts
export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatUBTC(amount: number): string {
  return `${amount} µ`
}

export function convertUBTCtoUSD(uBTC: number, btcPriceInUSD: number): number {
  // Convert µBTC to BTC (1 µBTC = 0.000001 BTC)
  const btc = uBTC * 0.000001
  // Convert BTC to USD
  return btc * btcPriceInUSD
}
```

### lib/utils.ts
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```
