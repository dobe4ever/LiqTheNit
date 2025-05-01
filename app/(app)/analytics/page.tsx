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