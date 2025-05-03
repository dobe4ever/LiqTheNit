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