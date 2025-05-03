# Codebase Dump

### src/actions/auth.ts
```ts
// src/actions/auth.ts
"use server"
import { createSrvClient } from "@/auth/server"
import { redirect } from "next/navigation"

export async function signIn(data: FormData) {
  const email = data.get("email") as string
  const pass = data.get("password") as string
  const supabase = createSrvClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
  if (error) return { error: error.message }

  redirect("/?toast=loginSuccess")
}

export async function signUp(data: FormData) {
  const email = data.get("email") as string
  const pass = data.get("password") as string
  const supabase = createSrvClient()

  const { error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }

  return { message: "Check email for verification link." }
}

export async function googleSignIn() {
  const supabase = createSrvClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = createSrvClient()
  await supabase.auth.signOut()
  redirect("/auth?toast=signOutSuccess")
}
\`\`\`

### src/actions/game.ts
```ts
// src/actions/game.ts
"use server"
import { createSrvClient, getUser } from "@/auth/server"
import { revalidatePath } from "next/cache"
import { getStartOfWeek, getHoursDifference } from "@/lib/utils/date" // Added getHoursDifference
import { Game, Database } from "@/types/db" // Added Database

// Type helper for insert/update (ensure Database type is imported)
type GameInsert = Database["public"]["Tables"]["games"]["Insert"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]

// Helper to check user auth
async function checkAuth() {
  const user = await getUser()
  if (!user) throw new Error("Auth required.")
  return user.id
}

// Start new game
export async function startGame(data: FormData) {
  const userId = await checkAuth()
  const supabase = createSrvClient()

  const gameData: GameInsert = {
    user_id: userId,
    game_type: data.get("gameType") as string,
    buy_in: Number(data.get("buyIn")),
    start_stack: Number(data.get("startStack")),
    start_time: new Date().toISOString(),
  }

  const { error } = await supabase.from("games").insert(gameData)
  if (error) {
    console.error("Start Game Error:", error) // Log error
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

// End active game
export async function endGame(data: FormData) {
  const userId = await checkAuth(); // Ensure user is checked
  const supabase = createSrvClient()
  const gameId = data.get("gameId") as string
  const endStackStr = data.get("endStack") as string

  if (!gameId || endStackStr === null || endStackStr === undefined) {
    return { error: "Missing game ID or end stack." }
  }

  const endStackNum = Number(endStackStr);
  if (isNaN(endStackNum)) {
      return { error: "Invalid end stack value." }
  }

  const updateData: GameUpdate = {
    end_stack: endStackNum,
    end_time: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId)
    .eq("user_id", userId) 

  if (error) {
    console.error("End Game Error:", error)
    return { error: `Failed to end game: ${error.message}` }
  }

  revalidatePath("/")
  revalidatePath("/history")
  revalidatePath("/analytics")
  return { success: true }
}

// Get active games
export async function getActiveGames(): Promise<{ data?: Game[], error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get game history (paginated)
export async function getGameHistory(page = 0, pageSize = 25): Promise<{ data?: Game[], count?: number, error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const { data, count, error } = await supabase
      .from("games")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .not("end_stack", "is", null)
      .order("end_time", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    return { data: data || [], count: count ?? 0 }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get weekly stats
export async function getWeekStats(): Promise<{ data?: { totalProfit: number, totalHours: number }, error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const startOfWeek = getStartOfWeek().toISOString()

    const { data, error } = await supabase
      .from("games")
      .select("start_time, end_time, start_stack, end_stack")
      .eq("user_id", userId)
      .gte("end_time", startOfWeek)
      .not("end_time", "is", null)
      .not("end_stack", "is", null)

    if (error) throw error

    let totalProfit = 0;
    let totalHours = 0;
    (data || []).forEach(g => {
      totalProfit += (g.end_stack ?? 0) - (g.start_stack ?? 0)
      if (g.start_time && g.end_time) totalHours += getHoursDifference(g.start_time, g.end_time)
    })

    return { data: { totalProfit, totalHours: Math.round(totalHours * 100) / 100 } }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get chart data
export async function getChartData(periodDays: number): Promise<{ data?: any[], error?: string }> {
   try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - periodDays)

    const { data, error } = await supabase
        .from("games")
        .select("start_stack, end_stack, start_time, end_time")
        .eq("user_id", userId)
        .gte("end_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())
        .not("end_time", "is", null)
        .not("end_stack", "is", null)
        .order("end_time", { ascending: true })

    if (error) throw error
    return { data: data || [] }
   } catch (err: any) {
     return { error: err.message }
   }
}
\`\`\`

### src/actions/profile.ts
```ts
// src/actions/profile.ts
"use server"
import { createSrvClient } from "@/auth/server"
import { Database } from "@/types/db" // Import Database type

// Type helper for profile insert/update
type ProfileUpsert = Omit<Database["public"]["Tables"]["profiles"]["Insert"], "created_at"> & { created_at?: string } // Adjust if needed based on actual schema

export async function upsertProfile(userId: string, email?: string) {
  const supabase = createSrvClient()

  // Prepare data based on actual profiles schema (NO updated_at)
  const profileData: Pick<ProfileUpsert, "id" | "username" | "email"> = {
    id: userId,
    username: email?.split("@")[0] || "user",
    email: email || null,
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(profileData, {
       onConflict: "id",
       ignoreDuplicates: false // Ensures update if exists
      });
}
\`\`\`

### src/app/(app)/analytics/page.tsx
```tsx
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
\`\`\`

### src/app/(app)/history/page.tsx
```tsx
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
\`\`\`

### src/app/(app)/layout.tsx
```tsx
// src/app/(app)/layout.tsx
import type React from "react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { getUser } from "@/auth/server"
import { upsertProfile } from "@/actions/profile"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser() 

  if (!user) {
    redirect("/auth")
  }

  // Call upsert action after successful auth check
  await upsertProfile(user.id, user.email)

  return (
    <div className="flex min-h-screen flex-col m-2">
      <Navbar user={user} /> 
      <main className="flex-1 p-2 md:p-6 mt-0 sm:mt-0">
        <div className="container mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
\`\`\`

### src/app/(app)/page.tsx
```tsx
import { GameForm } from "@/components/start/game-form"
import { ActiveGamesList } from "@/components/start/active-games-list"

export default async function StartPage() {
  return (
    // Main wrapper
    <div className="flex flex-col pb-10 sm:flex-row justify-between gap-4 w-">

      {/* Row 1: Title + subline */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start</h1>
        <p className="text-muted-foreground">Track your games</p>
      </div>

      {/* Row 2: Game form */}
      <GameForm />

      {/* Row 3: Active games */}
      <ActiveGamesList />

    </div>
  )
}
\`\`\`

### src/app/(auth)/auth/callback/route.ts
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
\`\`\`

### src/app/(auth)/auth/page.tsx
```tsx
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getSupabaseServerClient } from "@/app/supabase/server"

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
\`\`\`

### src/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 346.8 77.2% 49.8%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 346.8 77.2% 49.8%;
    --radius: 1.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 20 14.3% 4.1%;
    --foreground: 0 0% 95%;
    --card: 24 9.8% 10%;
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 95%;
    --primary: 346.8 77.2% 49.8%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 15%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 85.7% 97.3%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 346.8 77.2% 49.8%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
\`\`\`

### src/app/layout.tsx
```tsx
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
\`\`\`

### src/auth/client.ts
```ts
// src/auth/client.ts
"use client"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/types/db" // Import generated types

// Create a singleton Supabase client for browser
let client: ReturnType<typeof createBrowserClient<Database>>

export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>( // Use Database type
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return client
}
\`\`\`

### src/auth/server.ts
```ts
// src/auth/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/types/db" // Import generated types

export function createSrvClient() {
  const cookieStore = cookies()
  return createServerClient<Database>( // Use Database type
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {}
        },
      },
    },
  )
}

export async function getUser() {
  const supabase = createSrvClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}
\`\`\`

### src/components/analytics/hours-chart.tsx
```tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getHoursDifference } from "@/lib/utils/date-formatter"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { gamesTable } from "@/app/supabase/tables"

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
\`\`\`

### src/components/analytics/performance-chart.tsx
```tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/utils/number-formatter"
import { getHoursDifference } from "@/lib/utils/date-formatter"
import { gamesTable } from "@/app/supabase/tables"

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
\`\`\`

### src/components/analytics/profit-chart.tsx
```tsx
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
\`\`\`

### src/components/auth/auth-form.tsx
```tsx
// src/components/auth/auth-form.tsx
"use client"
import { LogoSymbol } from "@/components/logo-symbol"
import { useState, useTransition } from "react" // Use useTransition
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names if available
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { signIn, signUp, googleSignIn } from "@/actions/auth" // Import actions

export function AuthForm() {
  const [isPending, startTransition] = useTransition() // Pending state for actions
  const { toast } = useToast()

  const handleAction = (action: (formData: FormData) => Promise<any>) => {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      startTransition(async () => {
        const result = await action(formData)
        if (result?.error) {
          toast({ title: "Error", description: result.error, variant: "destructive" })
        } else if (result?.message) {
          toast({ title: "Success", description: result.message })
        }
        // Redirect handled by server action
      })
    }
  }

  const handleGoogle = () => {
     startTransition(async () => {
       const result = await googleSignIn()
       if (result?.error) toast({ title: "Google Error", description: result.error, variant: "destructive" })
       // Redirect handled by server action
     })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-col items-center">
        <LogoSymbol className="h-12 w-9" />
        <CardTitle className="text-2xl font-bold text-center">NIT</CardTitle>
        <CardDescription className="text-center">Track OFC progress</CardDescription>
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="mx-6 grid w- grid-cols-2">
          <TabsTrigger value="signin">In</TabsTrigger>
          <TabsTrigger value="signup">Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleAction(signIn)}> {/* Use action */}
            <CardContent className="space-y-4 pt-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input name="email" id="email-in" type="email" required disabled={isPending} />
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="pass-in">Password</Label>
                <Input name="password" id="pass-in" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "..." : "Sign In"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
           <form onSubmit={handleAction(signUp)}> {/* Use action */}
            <CardContent className="space-y-4 pt-4">
               {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input name="email" id="email-up" type="email" required disabled={isPending} />
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="pass-up">Password</Label>
                <Input name="password" id="pass-up" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "..." : "Sign Up"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
\`\`\`

### src/components/history/bitcoin-price-display.tsx
```tsx
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
\`\`\`

### src/components/history/games-table.tsx
```tsx
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
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { gamesTable } from "@/app/supabase/tables"

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
\`\`\`

### src/components/history/week-stats.tsx
```tsx
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
\`\`\`

### src/components/layout/navbar.tsx
```tsx
// src/components/layout/navbar.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { NavUser } from "@/components/nav-user"
import { LogoSymbol } from "@/components/logo-symbol"
import { useState, useTransition, useEffect } from "react" // Added useTransition, useEffect
import type { User } from "@supabase/supabase-js"
import { signOut } from "@/actions/auth" // Import signOut action
import { useSearchParams } from 'next/navigation' // Import useSearchParams

const navItems = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

// Receive user as prop now
export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams() // Get search params
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Toast notifications based on URL params
  useEffect(() => {
    const toastType = searchParams.get('toast')
    if (toastType === 'loginSuccess') {
      toast({ title: "Success!", description: "Signed in." })
       // Optional: remove toast param from URL
       window.history.replaceState(null, '', pathname)
    } else if (toastType === 'signOutSuccess') {
       toast({ title: "Success!", description: "Signed out." })
       window.history.replaceState(null, '', pathname)
    }
     // Add more toasts as needed
  }, [searchParams, toast, pathname])


  const handleSignOut = async () => {
    startTransition(async () => {
      await signOut() // Call server action
      // Edited to get rid of error
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* Logo */}
        <div className="flex items-center justify-left pl-2">
          <div className="hidden sm:flex"><LogoSymbol className="h-9 w-7.5 text-primary mr-1.5" /></div>
          <div className="hidden sm:flex"><Link href="/" className="text-3xl font-bold">NIT</Link></div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button variant={pathname === item.href ? "secondary" : "ghost"} size="sm" className="gap-x-1.5">
                <item.icon className="h-4 w-4" />{item.label}
              </Button>
            </Link>
          ))}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={isPending} />
        </div>

        {/* Mobile Nav */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium ${pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <item.icon className="mb-0.5 h-5 w-5" /><span>{item.label}</span>
            </Link>
          ))}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={isPending} />
        </div>
      </div>
    </nav>
  )
}
\`\`\`

### src/components/layout/switch-theme.tsx
```tsx
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
\`\`\`

### src/components/logo-symbol.tsx
```tsx
import * as React from 'react'; 
type ImageProps = React.ComponentPropsWithoutRef<'img'>;

export function LogoSymbol(props: ImageProps) {
  return (
    <img
      src="/logo_symbol.png" // Path relative to the public folder
      alt="LiqTheNit Logo Symbol" // Descriptive alt text
      // Spread props to allow className, style, width, height etc.
      {...props}
    />
  );
}
\`\`\`

### src/components/nav-user.tsx
```tsx
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
\`\`\`

### src/components/start/active-games-list.tsx
```tsx
// src/components/start/active-games-list.tsx
"use client"
import { useState, useEffect, useTransition, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime, getHoursDifference } from "@/lib/utils/date"
import { formatUBTC, formatMoney, convertUBTCtoUSD } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { getBitcoinPriceInUSD } from "@/lib/services/bitcoin-price"
import { getActiveGames, endGame } from "@/actions/game" // Import actions
import type { Game } from "@/types/db"

export function ActiveGamesList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition() // For ending game
  const [endingGameId, setEndingGameId] = useState<string | null>(null)
  const [endStack, setEndStack] = useState<string>("")
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [gamesResult, price] = await Promise.all([
        getActiveGames(), // Fetch using action
        getBitcoinPriceInUSD(),
      ])
      if (gamesResult.error) throw new Error(gamesResult.error)
      setGames(gamesResult.data || [])
      setBtcPrice(price)
    } catch (error: any) {
      toast({ title: "Error", description: `Fetch failed: ${error.message}`, variant: "destructive" })
      setGames([]) // Clear data on error
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
    // Optional: Add polling or Supabase real-time listener for updates if needed
  }, [fetchData])

  const handleEndClick = (game: Game) => {
    setEndingGameId(game.id)
    setEndStack(game.start_stack.toString()) // Pre-fill start stack
  }

  const submitEnd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!endingGameId) return
    const formData = new FormData(e.currentTarget)
    // Ensure gameId is included
    formData.set('gameId', endingGameId)

    startTransition(async () => {
      const result = await endGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game ended." })
        setEndingGameId(null)
        setEndStack("")
        fetchData() // Refresh list
      }
    })
  }

  const cancelEnd = () => {
    setEndingGameId(null)
    setEndStack("")
  }

  const isLoading = loading || isPending

  // Render skeleton/empty states
  if (loading && games.length === 0) {
    return <div className="space-y-4"><div className="h-6 bg-muted rounded w-1/2"></div><div className="animate-pulse space-y-4"><div className="h-24 bg-muted rounded-md"></div></div></div>
  }
  if (!loading && games.length === 0) {
     return <div className="space-y-4"><h2 className="text-xl font-semibold">Active Tables</h2><Card><CardContent className="p-6 text-center text-muted-foreground">No active games.</CardContent></Card></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => {
          const isEnding = endingGameId === game.id
          const time = getHoursDifference(game.start_time, new Date().toISOString()).toFixed(2)
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type}</CardTitle>
                    <CardDescription>Start: {formatDateTime(game.start_time)}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUBTC(game.buy_in)}</div>
                    <div className="text-sm text-muted-foreground">{formatMoney(convertUBTCtoUSD(game.buy_in, btcPrice))}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2">
                   <div className="flex justify-between"><span className="text-muted-foreground">Start Stack:</span><div><span className="font-medium">{formatUBTC(game.start_stack)}</span><div className="text-sm text-muted-foreground">{formatMoney(convertUBTCtoUSD(game.start_stack, btcPrice))}</div></div></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Time:</span><span className="font-medium">{time} h</span></div>
                 </div>

                {isEnding && (
                  <form onSubmit={submitEnd} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-${game.id}`}>End Stack (µ)</Label>
                      <Input name="endStack" id={`end-${game.id}`} type="number" value={endStack} onChange={(e) => setEndStack(e.target.value)} required disabled={isPending} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isPending}>{isPending ? "..." : "Confirm"}</Button>
                      <Button type="button" onClick={cancelEnd} variant="outline" className="flex-1" disabled={isPending}>Cancel</Button>
                    </div>
                  </form>
                )}
              </CardContent>
              {!isEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndClick(game)} variant="default" className="w-full" disabled={isLoading}>End</Button>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
\`\`\`

### src/components/start/game-form.tsx
```tsx
// src/components/start/game-form.tsx
"use client"
import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardFooter, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { startGame } from "@/actions/game" // Import action
import { getBrowserClient } from "@/auth/client" // Only for checking initial auth state

export function GameForm() {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [isUser, setIsUser] = useState(false) // Still useful for conditional render
  const { toast } = useToast()
  const supabase = getBrowserClient() // Get client

  // Check auth state on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsUser(!!user)
    }
    checkUser()
     // Listen for auth changes if needed, though actions handle auth internally
     const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
       setIsUser(!!session?.user)
     })
     return () => { authListener.subscription.unsubscribe() }
  }, [supabase])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isUser) {
      toast({ title: "Error", description: "Log in first.", variant: "destructive" })
      return
    }
    if (!startStack) {
      toast({ title: "Error", description: "Enter start stack.", variant: "destructive" })
      return
    }

    const formData = new FormData(e.currentTarget)
    // Add selected values manually if not directly named in form
    formData.set('gameType', gameType)
    formData.set('buyIn', buyIn)

    startTransition(async () => {
      const result = await startGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game started." })
        setStartStack("") // Reset form field
      }
    })
  }

  if (!isUser) {
    return (
      <Card>
        <CardHeader><CardTitle>New Game</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Log in to start.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Start New Game</CardTitle></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Game Type Select */}
           <div className="space-y-2">
            <Label htmlFor="game-type">Type</Label>
            <Select name="gameType" value={gameType} onValueChange={setGameType} disabled={isPending}>
              <SelectTrigger id="game-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Buy In Select */}
           <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µ)</Label>
            <Select name="buyIn" value={buyIn} onValueChange={setBuyIn} disabled={isPending}>
              <SelectTrigger id="buy-in"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Start Stack Input */}
           <div className="space-y-2">
            <Label htmlFor="start-stack">Start Stack (µ)</Label>
            <Input name="startStack" id="start-stack" type="number" value={startStack} onChange={(e) => setStartStack(e.target.value)} placeholder="Enter stack" disabled={isPending} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
\`\`\`

### src/components/theme-provider.tsx
```tsx
'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
\`\`\`

### src/hooks/use-mobile.tsx
```tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

\`\`\`

### src/hooks/use-toast.ts
```ts
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

\`\`\`

### src/lib/services/bitcoin-price.ts
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

\`\`\`

### src/lib/utils/date.ts
```ts
// src/lib/utils/date.ts
// Consolidate date functions

export function formatDate(d: Date | string): string {
    const dt = typeof d === "string" ? new Date(d) : d
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  
  export function formatDateTime(d: Date | string): string {
    const dt = typeof d === "string" ? new Date(d) : d
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  
  export function getHoursDifference(start: Date | string, end: Date | string): number {
    const startDt = typeof start === "string" ? new Date(start) : start
    const endDt = typeof end === "string" ? new Date(end) : end
    const diffMs = Math.abs(endDt.getTime() - startDt.getTime())
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // hours with 2 decimals
  }
  
  export function getStartOfWeek(): Date {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }
\`\`\`

### src/lib/utils/format.ts
```ts
// src/lib/utils/format.ts
// Consolidate formatters

export function formatMoney(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  }
  
  export function formatUBTC(amount: number): string {
    // Format with comma separators for readability if large
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return `${formatted} µ`
  }
  
  export function convertUBTCtoUSD(uBTC: number, btcPriceUSD: number): number {
    if (!btcPriceUSD) return 0
    return (uBTC / 1_000_000) * btcPriceUSD
  }
\`\`\`

### src/lib/utils.ts
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

\`\`\`

### src/types/db.ts
```ts
// src/types/db.ts
// Run: npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/db.ts
// Or manually define if needed:
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          user_id: string
          game_type: string
          buy_in: number
          start_stack: number
          end_stack: number | null
          start_time: string
          end_time: string | null
        }
        Insert: {
          id?: string
          user_id: string
          game_type: string
          buy_in: number
          start_stack: number
          end_stack?: number | null
          start_time?: string
          end_time?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: string
          buy_in?: number
          start_stack?: number
          end_stack?: number | null
          start_time?: string
          end_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string | null 
          created_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          email?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export row types for convenience
export type Game = Database["public"]["Tables"]["games"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
\`\`\`

### next.config.mjs
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ++ Add this section ++
  experimental: {
    serverActions: {
      // Replace with your specific Codespace URL including the protocol (https://)
      allowedOrigins: ["localhost:3000", "jubilant-lamp-5w5x759wqr5hv4jx.github.dev"],
    },
  },
  // ++ End of added section ++
}

export default nextConfig
\`\`\`

### eslint.config.mjs
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
\`\`\`

### components.json
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
\`\`\`
