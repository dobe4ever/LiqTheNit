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