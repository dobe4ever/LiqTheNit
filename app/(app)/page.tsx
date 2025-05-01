import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SessionController } from "@/components/start/session-controller"
import { GameForm } from "@/components/start/game-form"
import { ActiveGamesList } from "@/components/start/active-games-list"

export default async function StartPage() {
  const supabase = getSupabaseServerClient()

  const { data: user } = await supabase.auth.getUser()

  // Get active session
  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, start_time, end_time")
    .eq("user_id", user.user?.id)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .maybeSingle()

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Start</h1>
          <p className="text-muted-foreground">Start a session and track your games</p>
        </div>

        <SessionController />
      </div>

      {activeSession ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Prop 'onGameCreated' removed */}
          <GameForm sessionId={activeSession.id} />
          {/* Prop 'onUpdate' removed */}
          <ActiveGamesList sessionId={activeSession.id} />
        </div>
      ) : (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
          <h3 className="text-xl font-semibold">No Active Session</h3>
          <p className="text-muted-foreground mt-2">Start a session to begin tracking your games</p>
        </div>
      )}
    </div>
  )
}