# Codebase Dump

```
.
├── node_modules/
├── public/
├── src
│   ├── actions
│   │   ├── auth.ts
│   │   ├── games.ts
│   │   └── profiles.ts
│   ├── app
│   │   ├── (app)
│   │   │   ├── analytics
│   │   │   │   └── page.tsx
│   │   │   ├── history
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)
│   │   │   └── auth
│   │   │       ├── callback
│   │   │       │   └── route.ts
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── supabase
│   │       ├── admin.ts
│   │       ├── client.ts
│   │       └── server.ts
│   ├── auth
│   │   ├── client.ts
│   │   └── server.ts
│   ├── components
│   │   ├── analytics
│   │   │   ├── hours-chart.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   └── profit-chart.tsx
│   │   ├── auth
│   │   │   └── auth-form.tsx
│   │   ├── history
│   │   │   ├── bitcoin-price-display.tsx
│   │   │   ├── games-table.tsx
│   │   │   └── week-stats.tsx
│   │   ├── layout
│   │   │   ├── nav-user.tsx
│   │   │   ├── nav.tsx
│   │   │   └── theme-switch.tsx
│   │   ├── logo.tsx
│   │   ├── start
│   │   │   ├── active-games.tsx
│   │   │   └── game-form.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib
│   │   ├── date.ts
│   │   ├── num.ts
│   │   └── utils.ts
│   ├── services
│   │   └── btc.ts
│   └── types
│       └── db.ts
└── tsconfig.json
```

### src/actions/auth.ts
```ts
"use server"
// Remove: import { createClient } from "@/auth/server"
import { redirect } from "next/navigation"
import { upsertProfile } from "./profiles"
import { createClient } from "@/auth/server" // Keep this import if getUser is used, or import inside functions

// Handle errors consistently
const handleAuthError = (error: any, context: string) => {
  console.error(`${context} Error:`, error.message)
  return { error: error.message || "An unexpected error occurred." }
}

// Sign in with email/password
export async function signIn(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign In")
  }
  redirect("/")
}

// Sign up with email/password
export async function signUp(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (!signUpData.user) throw new Error("User not created after sign up.")

    const profileResult = await upsertProfile(signUpData.user.id, email)
    if (profileResult.error) throw new Error(profileResult.error)

  } catch (error: any) {
    return handleAuthError(error, "Sign Up")
  }
  return { error: null, message: "Check email for confirmation." }
}

// Sign in with Google OAuth
export async function googleSignIn() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (data.url) redirect(data.url)
  } catch (error: any) {
    return handleAuthError(error, "Google Sign In")
  }
}

// Sign out
export async function signOut() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign Out")
  }
  redirect("/auth")
}
\`\`\`

### src/actions/games.ts
```ts
"use server"
// Remove: import { createClient, getUser } from "@/auth/server"
import type { Game } from "@/types/db"
import { createClient, getUser } from "@/auth/server" // Keep these imports

// Handle errors
const handleGameError = (error: any, context: string) => {
  console.error(`${context} Error:`, error.message)
  return { data: null, error: `Failed to ${context.toLowerCase()}.` }
}

// Start a new game
export async function startGame(data: FormData) {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { error: "Auth required." }

  const gameType = data.get("gameType") as string
  const buyIn = parseInt(data.get("buyIn") as string, 10)
  const startStack = parseInt(data.get("startStack") as string, 10)

  if (isNaN(buyIn) || isNaN(startStack)) return { error: "Invalid input." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.from("games").insert({
      user_id: user.id, game_type: gameType, buy_in: buyIn,
      start_stack: startStack, start_time: new Date().toISOString(),
    })
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    return handleGameError(error, "Start Game")
  }
}

// End an active game
export async function endGame(gameId: string, endStackStr: string) {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { error: "Auth required." }

  const endStack = parseInt(endStackStr, 10)
  if (isNaN(endStack)) return { error: "Invalid end stack." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.from("games").update({
      end_stack: endStack, end_time: new Date().toISOString()
    }).eq("id", gameId).eq("user_id", user.id)
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    return handleGameError(error, "End Game")
  }
}

// Get active games for current user
export async function getActiveGames(): Promise<{ data: Game[] | null, error: string | null }> {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { data: null, error: "Auth required." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { data, error } = await supabase.from("games").select("*")
      .eq("user_id", user.id).is("end_time", null)
      .order("start_time", { ascending: false })
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return handleGameError(error, "Fetch Active Games")
  }
}

// Get completed games (paginated)
export async function getDoneGames(page: number, size: number): Promise<{ data: Game[] | null, count: number | null, error: string | null }> {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { data: null, count: null, error: "Auth required." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { data, count, error } = await supabase.from("games")
      .select("*", { count: "exact" }).eq("user_id", user.id)
      .not("end_time", "is", null).not("end_stack", "is", null)
      .order("end_time", { ascending: false })
      .range(page * size, (page + 1) * size - 1)
    if (error) throw error
    return { data, count, error: null }
  } catch (error: any) {
    console.error("Fetch Done Games Error:", error.message)
    return { data: null, count: null, error: "Failed to fetch history." }
  }
}

// Get games within a date range (for charts/stats)
export async function getGamesPeriod(start: string, end: string): Promise<{ data: Game[] | null, error: string | null }> {
    const user = await getUser() // <-- Call getUser INSIDE action
    if (!user) return { data: null, error: "Auth required." }

    const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
    try {
        const { data, error } = await supabase.from("games")
            .select("id, start_stack, end_stack, start_time, end_time")
            .eq("user_id", user.id).gte("end_time", start).lte("end_time", end)
            .not("end_time", "is", null).not("end_stack", "is", null)
            .order("end_time", { ascending: true })
        if (error) throw error
        return { data: null, error: null }
    } catch (error: any) {
        return handleGameError(error, "Fetch Games for Period")
    }
}
\`\`\`

### src/actions/profiles.ts
```ts
"use server"
// Remove: import { createAdminClient } from "@/auth/server"
import { createClient } from "@/auth/server" // Keep this import

// Upsert profile (used on layout and sign up)
export async function upsertProfile(userId: string, email?: string) {
  const supabaseAdmin = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const username = email?.split("@")[0] || `user_${userId.substring(0, 6)}`

  try {
    const { error } = await supabaseAdmin.from("profiles").upsert(
      { id: userId, username, email, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    )
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    console.error("Upsert Profile Error:", error.message)
    return { error: "Failed to update profile." }
  }
}
\`\`\`

### src/app/(app)/analytics/page.tsx
```tsx
// src/app/(app)/analytics/page.tsx (AnalyticsPage)
import { PerformanceChart } from "@/components/analytics/performance-chart"
import { ProfitChart } from "@/components/analytics/profit-chart"
import { HoursChart } from "@/components/analytics/hours-chart"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default function AnalyticsPage() {
  return (
    // Use PageContainer as the outermost wrapper
    <PageContainer>
      {/* Row 1: PageHeader (Title + subline) */}
      <PageHeader title="Analytics" subtitle="Track your performance over time" />

      {/* Row 2: Performance chart */}
      <PerformanceChart />

      {/* Row 3: Profits chart */}
      <ProfitChart />

      {/* Row 4: Time played chart */}
      <HoursChart />
    </PageContainer>
  )
}
\`\`\`

### src/app/(app)/history/page.tsx
```tsx
// src/app/(app)/history/page.tsx (HistoryPage)
import { WeekStats } from "@/components/history/week-stats"
import { GamesTable } from "@/components/history/games-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default function HistoryPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  return (
    // Use PageContainer as the outermost wrapper
    <PageContainer>
      {/* Row 1: PageHeader (Title + subline) */}
      <PageHeader title="History" subtitle={today} />

      {/* Row 2: Weekly stats */}
      <WeekStats />

      {/* Row 3: history of games table */}
      <GamesTable />
    </PageContainer>
  )
}
\`\`\`

### src/app/(app)/layout.tsx
```tsx
// src/app/(app)/layout.tsx
import type React from "react"
import { redirect } from "next/navigation"
import { Nav } from "@/components/layout/nav"
import { getUser } from "@/auth/server"
import { upsertProfile } from "@/actions/profiles"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) redirect("/auth")

  await upsertProfile(user.id, user.email)

  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  )
}
\`\`\`

### src/app/(app)/page.tsx
```tsx
// src/app/(app)/page.tsx (StartPage)
import { GameForm } from "@/components/start/game-form"
import { ActiveGames } from "@/components/start/active-games"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default async function StartPage() {
  return (
    // Use PageContainer as the outermost wrapper
    <PageContainer>
      {/* Row 1: PageHeader (Title + subline) */}
      <PageHeader title="Start" subtitle="Track your games" />

      {/* Row 2: Game form */}
      <GameForm />

      {/* Row 3: Active games */}
      <ActiveGames />
    </PageContainer>
  )
}
\`\`\`

### src/app/(auth)/auth/callback/route.ts
```ts
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createSrvClient } from "@/auth/server" // Use centralized server client

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = createSrvClient() // Use standard server client
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error("Code Exchange Error:", error.message)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin)
}
\`\`\`

### src/app/(auth)/auth/page.tsx
```tsx
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getUser } from "@/auth/server" // Use centralized getter

export default async function AuthPage() {
  const user = await getUser()
  if (user) redirect("/") // Redirect if already logged in

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
    /* --card: 24 9.8% 10%; */
    --card: 12 6.5% 15.1%;
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
    /* --border: 240 3.7% 15.9%; */
    --border: 0 0% 36%;
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
// src/app/layout.tsx
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

### src/app/supabase/admin.ts
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
\`\`\`

### src/app/supabase/client.ts
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
\`\`\`

### src/app/supabase/server.ts
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
\`\`\`

### src/auth/client.ts
```ts
"use client"
import { createBrowserClient } from "@supabase/ssr"

// Create browser client instance (singleton)
let client: ReturnType<typeof createBrowserClient> | null = null

export function createCliClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
\`\`\`

### src/auth/server.ts
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );

  return client;
}

export async function getUser() {
  const { auth } = await createClient();

  const userObject = await auth.getUser();

  if (userObject.error) {
    console.error(userObject.error);
    return null;
  }

  return userObject.data.user;
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
import { hrsDiff } from "@/lib/date"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { GamesTable } from "@/components/history/games-table"

export function HoursChart() {
  const [games, setGames] = useState<GamesTable[]>([])
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
        const hours = hrsDiff(game.start_time, game.end_time)

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
                  content={<ChartTooltipContent formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)} hours` : value} />}
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
import { getBtcUsd } from "@/services/btc"
import { fmtUBtc, uBtcToUsd, fmtMoney } from "@/lib/num"
import { hrsDiff } from "@/lib/date"
import { GamesTable } from "@/components/history/games-table"

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
  const [games, setGames] = useState<GamesTable[]>([])
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
        const hours = hrsDiff(game.start_time, game.end_time)
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
          getBtcUsd(),
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
            const hours = hrsDiff(game.start_time, game.end_time)
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
                      {fmtUBtc(totals.profit)}
                    </span>
                    <div className="text-xs font-normal text-muted-foreground">
                      {fmtMoney(uBtcToUsd(totals.profit, btcPrice))}
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
                      formatter={(value) => {
                        const numValue = typeof value === "number" ? value : parseFloat(value as string)
                        if (activeMetric === "profit") {
                          return [fmtUBtc(numValue), fmtMoney(uBtcToUsd(numValue, btcPrice))]
                        } else {
                          return [`${numValue.toFixed(1)} hours`]
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
import { formatUBTC, convertUBTCtoUSD, formatMoney } from "@/lib/num"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/app/supabase/client"
import { getBitcoinPriceInUSD } from "@/services/btc"
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
"use client"
import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { signIn, signUp, googleSignIn } from "@/actions/auth" // Use actions
import { Logo } from "@/components/logo"

export function AuthForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  // Handle form submission using server actions
  const handleAction = (action: (formData: FormData) => Promise<any>, successMsg?: string) => {
    return (formData: FormData) => {
      startTransition(async () => {
        const result = await action(formData)
        if (result?.error) {
          toast({ title: "Error", description: result.error, variant: "destructive" })
        } else if (successMsg || result?.message) {
          toast({ title: "Success", description: successMsg || result.message })
          // No router.push needed for sign in/out, actions handle redirect
          // For sign up, stay on page to show message
          if (action !== signUp) router.refresh() // Refresh for state changes if not sign up
        } else {
           router.refresh() // Refresh on success if no message (e.g., Google redirect handled by action)
        }
      })
    }
  }

  const handleGoogle = () => {
      startTransition(async () => {
          const result = await googleSignIn()
          if (result?.error) {
              toast({ title: "Error", description: result.error, variant: "destructive" })
          }
          // Redirect is handled by the action if successful
      })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-col items-center">
        <Logo className="h-12 w-9" /> {/* Use renamed Logo */}
        <CardTitle className="text-2xl font-bold text-center">NIT</CardTitle>
        <CardDescription className="text-center">Track OFC poker progress</CardDescription> {/* Shortened */}
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="mx-6 grid w- grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          {/* Use action prop for form */}
          <form action={handleAction(signIn)}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" name="email" type="email" placeholder="you@mail.com" required disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-in">Password</Label>
                <Input id="pass-in" name="password" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          {/* Use action prop for form */}
          <form action={handleAction(signUp)}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" name="email" type="email" placeholder="you@mail.com" required disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-up">Password</Label>
                <Input id="pass-up" name="password" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "Signing up..." : "Sign Up"}
              </Button>
               {/* Separator */}
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>
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
import { formatMoney } from "@/lib/num"
import { getBitcoinPriceInUSD } from "@/services/btc"

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
\`\`\`

### src/components/history/week-stats.tsx
```tsx
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
\`\`\`

### src/components/layout/nav-user.tsx
```tsx
// src/components/layout/nav-user.tsx

"use client"
import { LogOut, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"
import { ThemeSwitch } from "./theme-switch"

// Get initials from email
function getInitials(email?: string): string {
  if (!email) return "?"
  const name = email.split("@")[0]
  return name.substring(0, 2).toUpperCase() // Simpler initials logic
}

export function NavUser({ user, onSignOut, isLoading }: {
  user: User | null
  onSignOut: () => Promise<void>
  isLoading: boolean
}) {
  // Show loader or avatar
  const trigger = isLoading ? (
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  ) : (
    <Avatar className="h-8 w-8">
      <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
    </Avatar>
  )

  // Don't render if not loading and no user
  if (!isLoading && !user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-4" align="end" forceMount>
        {user && ( // Only show content if user exists
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.user_metadata?.name || user.email?.split("@")[0]}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2">Prefs</DropdownMenuLabel> {/* Shortened */}
              {/* Theme Switch Item */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent">
                <ThemeSwitch />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
\`\`\`

### src/components/layout/nav.tsx
```tsx
// src/components/layout/nav.tsx

"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Clock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavUser } from "./nav-user"
import { Logo } from "@/components/logo"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createCliClient } from "@/auth/client" // Use client helper
import { signOut } from "@/actions/auth" // Use action
import { useToast } from "@/hooks/use-toast"

const items = [
  { href: "/", label: "Start", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function Nav() {
  const path = usePathname()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user on client mount
  useEffect(() => {
    const cli = createCliClient()
    const fetchUser = async () => {
      setLoading(true)
      const { data: { user: u }, error } = await cli.auth.getUser()
      if (error) console.error("Nav fetch user error:", error.message)
      setUser(u)
      setLoading(false)
    }
    fetchUser()
    // Listen for auth changes
    const { data: { subscription } } = cli.auth.onAuthStateChange((_event: any, session: { user: any }) => { // Add session parameter
      setUser(session?.user ?? null) // Use session.user here
      setLoading(false) // Update loading state on change
    })
    return () => subscription?.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    setLoading(true) // Show loading on avatar
    const result = await signOut() // Call server action
    if (result?.error) {
      toast({ title: "Sign out error", description: result.error, variant: "destructive" })
      setLoading(false) // Reset loading on error
    }
    // Redirect is handled by the action
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-1 sm:relative sm:border-b sm:border-t-0 sm:py-2">
      <div className="container mx-auto flex h-full items-center justify-between">
        {/* Logo (Desktop) */}
        <div className="hidden items-center pl-2 sm:flex">
          <Logo className="h-9 w-7.5 text-primary mr-1.5" />
          <Link href="/" className="text-3xl font-bold">NIT</Link>
        </div>

        {/* Nav Links (Desktop) */}
        <div className="hidden items-center gap-x-1 sm:flex md:gap-x-2">
          {items.map((item) => {
            const isActive = path === item.href
            return (
              <Link key={item.href} href={item.href} passHref>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-x-1.5">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              </Link>
            )
          })}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loading} />
        </div>

        {/* Nav Links (Mobile) */}
        <div className="flex w-full items-center justify-around sm:hidden">
          {items.map((item) => {
            const isActive = path === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                <item.icon className="mb-0.5 h-5 w-5" /> <span>{item.label}</span>
              </Link>
            )
          })}
          <NavUser user={user} onSignOut={handleSignOut} isLoading={loading} />
        </div>
      </div>
    </nav>
  )
}
\`\`\`

### src/components/layout/theme-switch.tsx
```tsx
// components/layout/switch-theme.tsx
"use client"

import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils" // Make sure you have this utility or adapt

export function ThemeSwitch() {
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

### src/components/logo.tsx
```tsx
import * as React from 'react'; 
type ImageProps = React.ComponentPropsWithoutRef<'img'>;

export function Logo(props: ImageProps) {
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

### src/components/start/active-games.tsx
```tsx
"use client"
import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDt, hrsDiff } from "@/lib/date" // Use renamed utils
import { fmtUBtc, uBtcToUsd, fmtMoney } from "@/lib/num" // Use renamed utils
import { useToast } from "@/hooks/use-toast"
import { getActiveGames, endGame } from "@/actions/games" // Use actions
import { getBtcUsd } from "@/services/btc" // Use service action
import type { Game } from "@/types/db"
import { createCliClient } from "@/auth/client" // Use client helper

export function ActiveGames() {
  const [games, setGames] = useState<Game[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isUser, setIsUser] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null) // Track which game is being ended
  const [endStack, setEndStack] = useState<string>("")
  const [isEnding, startEndTransition] = useTransition() // Loading state for ending a game
  const router = useRouter()
  const { toast } = useToast()

  // Fetch data (games and BTC price)
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Check auth first
      const cli = createCliClient()
      const { data: { user } } = await cli.auth.getUser()
      setIsUser(!!user)
      if (!user) {
          setGames([])
          setLoading(false)
          return
      }

      // Fetch games and price in parallel
      const [gamesRes, price] = await Promise.all([getActiveGames(), getBtcUsd()])

      if (gamesRes.error) throw new Error(gamesRes.error)

      setGames(gamesRes.data || [])
      setBtcPrice(price)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch data.", variant: "destructive" })
      setGames([]) // Clear games on error
    } finally {
      setLoading(false)
    }
  }, [toast]) // Add toast as dependency

  // Fetch data on mount and refresh
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle starting the end game process
  const handleEndClick = (game: Game) => {
    setEndingId(game.id)
    setEndStack(game.start_stack.toString()) // Pre-fill with start stack
  }

  // Handle submitting the end game form
  const submitEnd = (gameId: string) => {
    if (!endStack) {
      toast({ title: "Missing Stack", variant: "destructive" })
      return
    }
    startEndTransition(async () => {
      const result = await endGame(gameId, endStack)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game ended." })
        setEndingId(null) // Reset ending state
        setEndStack("")
        fetchData() // Re-fetch to update list
        router.refresh() // Refresh potentially other parts of the page
      }
    })
  }

  // Cancel ending a game
  const cancelEnd = () => {
    setEndingId(null)
    setEndStack("")
  }

  // --- Render Logic ---

  // Initial Loading Skeleton
  if (loading && games.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-md"></div> {/* Adjusted height */}
          <div className="h-32 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  // No User or No Active Games Message
  if (!isUser || (!loading && games.length === 0)) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {!isUser ? "Log in to see games." : "No active games."}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active Games List
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => {
          const isCurrentEnding = endingId === game.id
          return (
            <Card key={game.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{game.game_type}</CardTitle>
                    <CardDescription>Start: {fmtDt(game.start_time)}</CardDescription> {/* Use fmtDt */}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtUBtc(game.buy_in)}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(game.buy_in, btcPrice))}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Start Stack */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <div className="text-right">
                      <span className="font-medium">{fmtUBtc(game.start_stack)}</span>
                      <div className="text-xs text-muted-foreground">{fmtMoney(uBtcToUsd(game.start_stack, btcPrice))}</div>
                    </div>
                  </div>
                  {/* Time Elapsed */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{hrsDiff(game.start_time, new Date()).toFixed(1)} h</span> {/* Use hrsDiff */}
                  </div>
                </div>

                {/* End Game Form */}
                {isCurrentEnding && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`end-${game.id}`}>End Stack (µ)</Label>
                      <Input id={`end-${game.id}`} type="number" value={endStack}
                        onChange={(e) => setEndStack(e.target.value)} placeholder="Enter end stack"
                        required disabled={isEnding} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => submitEnd(game.id)} className="flex-1" disabled={isEnding}>
                        {isEnding ? "Confirm..." : "Confirm"}
                      </Button>
                      <Button onClick={cancelEnd} variant="outline" className="flex-1" disabled={isEnding}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              {/* End Game Button */}
              {!isCurrentEnding && (
                <CardFooter>
                  <Button onClick={() => handleEndClick(game)} variant="default" className="w-full" disabled={loading || isEnding}>
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
\`\`\`

### src/components/start/game-form.tsx
```tsx
"use client"
import type React from "react"
import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { startGame } from "@/actions/games" // Use action
import { createCliClient } from "@/auth/client" // Use client helper

export function GameForm() {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [isUser, setIsUser] = useState(false) // Track auth state
  const router = useRouter()
  const { toast } = useToast()

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const cli = createCliClient()
      const { data: { user } } = await cli.auth.getUser()
      setIsUser(!!user)
    }
    checkAuth()
    // Optional: Listen for auth changes if needed, but layout usually handles redirects
  }, [])

  const handleSubmit = (formData: FormData) => {
    if (!isUser) {
      toast({ title: "Auth Required", variant: "destructive" })
      return
    }
    if (!formData.get("startStack")) {
        toast({ title: "Missing Stack", variant: "destructive" })
        return
    }

    startTransition(async () => {
      const result = await startGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game started." })
        setStartStack("") // Clear input on success
        router.refresh() // Refresh page to update active games list
      }
    })
  }

  // Show login message if not authenticated
  if (!isUser) {
    return (
      <Card>
        <CardHeader><CardTitle>Start Game</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Log in to start.</p></CardContent>
      </Card>
    )
  }

  // Show form if authenticated
  return (
    <Card>
      <CardHeader><CardTitle>Start Game</CardTitle></CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Game Type */}
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
          {/* Buy In */}
          <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µ)</Label>
            <Select name="buyIn" value={buyIn} onValueChange={setBuyIn} disabled={isPending}>
              <SelectTrigger id="buy-in"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 µ</SelectItem>
                <SelectItem value="100">100 µ</SelectItem>
                <SelectItem value="200">200 µ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Start Stack */}
          <div className="space-y-2">
            <Label htmlFor="start-stack">Start Stack (µ)</Label>
            <Input id="start-stack" name="startStack" type="number" value={startStack}
              onChange={(e) => setStartStack(e.target.value)} placeholder="Enter stack"
              disabled={isPending} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Starting..." : "Start Game"}
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

### src/lib/date.ts
```ts
// Format date: Jan 1, 2024
export function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Format date & time: Jan 1, 2024, 09:30 AM
export function fmtDt(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true // Added hour12
  })
}

// Format time: 09:30 AM
export function fmtTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) // Added hour12
}

// Get hours difference between two dates
export function hrsDiff(start: Date | string, end: Date | string): number {
  const startDt = typeof start === "string" ? new Date(start) : start
  const endDt = typeof end === "string" ? new Date(end) : end
  const diffMs = Math.abs(endDt.getTime() - startDt.getTime())
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Round to 2 decimals
}

// Get start of the current week (Monday)
export function startOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, ...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0) // Set to start of day
  return monday
}
\`\`\`

### src/lib/num.ts
```ts
// Format currency: $1,234.56
export function fmtMoney(amt: number, cur = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: cur,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amt)
}

// Format micro-BTC: 100 µ
export function fmtUBtc(amt: number): string {
  // Handle potential NaN or null inputs gracefully
  if (isNaN(amt) || amt === null) return "0 µ"
  return `${amt} µ`
}

// Convert micro-BTC to USD
export function uBtcToUsd(uBtc: number, btcPrice: number): number {
  // Handle potential NaN or null inputs
  if (isNaN(uBtc) || uBtc === null || isNaN(btcPrice) || btcPrice === null || btcPrice === 0) return 0
  const btc = uBtc * 0.000001
  return btc * btcPrice
}
\`\`\`

### src/lib/utils.ts
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine & merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
\`\`\`

### src/services/btc.ts
```ts
"use server"
// Fetch BTC price from CoinGecko
export async function getBtcUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { next: { revalidate: 300 } } // Cache 5 min
    )
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    const data = await res.json()
    return data?.bitcoin?.usd ?? 0
  } catch (error: any) {
    console.error("BTC Price Error:", error.message)
    return 0 // Fallback
  }
}
\`\`\`

### src/types/db.ts
```ts
// Define Supabase table types
export interface Profile {
  id: string
  username: string | null
  email: string | null
  created_at: string
}

export interface Game {
  id: string
  user_id: string
  game_type: string
  buy_in: number
  start_stack: number
  end_stack: number | null
  start_time: string
  end_time: string | null
  updated_at: string
}

\`\`\`
