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