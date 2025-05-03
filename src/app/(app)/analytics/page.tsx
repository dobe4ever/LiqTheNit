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