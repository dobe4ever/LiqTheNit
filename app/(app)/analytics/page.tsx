import { PerformanceChart } from "@/components/analytics/performance-chart"
import { ProfitChart } from "@/components/analytics/profit-chart"
import { HoursChart } from "@/components/analytics/hours-chart"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your performance over time</p>
      </div>

      <div className="space-y-6">
        <PerformanceChart />
        <ProfitChart />
        <HoursChart />
      </div>
    </div>
  )
}
