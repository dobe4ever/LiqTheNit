import { WeekStats } from "@/components/history/week-stats"
import { GamesTable } from "@/components/history/games-table"
import { BitcoinPriceDisplay } from "@/components/ui/bitcoin-price-display"

export default function HistoryPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>

        <BitcoinPriceDisplay />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">This Week So Far</h2>
        <WeekStats />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Game History</h2>
        <GamesTable />
      </div>
    </div>
  )
}
