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