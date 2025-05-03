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