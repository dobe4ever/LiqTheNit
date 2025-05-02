// src/actions/game.ts
"use server"
import { createSrvClient, getUser } from "@/auth/server"
import { revalidatePath } from "next/cache"
import { getStartOfWeek, getHoursDifference } from "@/lib/utils/date" // Added getHoursDifference
import { Game, Database } from "@/types/db" // Added Database

// Type helper for insert/update (ensure Database type is imported)
type GameInsert = Database["public"]["Tables"]["games"]["Insert"]
type GameUpdate = Database["public"]["Tables"]["games"]["Update"]

// Helper to check user auth
async function checkAuth() {
  const user = await getUser()
  if (!user) throw new Error("Auth required.")
  return user.id
}

// Start new game
export async function startGame(data: FormData) {
  const userId = await checkAuth()
  const supabase = createSrvClient()

  const gameData: GameInsert = {
    user_id: userId,
    game_type: data.get("gameType") as string,
    buy_in: Number(data.get("buyIn")),
    start_stack: Number(data.get("startStack")),
    start_time: new Date().toISOString(),
  }

  const { error } = await supabase.from("games").insert(gameData)
  if (error) {
    console.error("Start Game Error:", error) // Log error
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

// End active game
export async function endGame(data: FormData) {
  const userId = await checkAuth(); // Ensure user is checked
  const supabase = createSrvClient()
  const gameId = data.get("gameId") as string
  const endStackStr = data.get("endStack") as string

  if (!gameId || endStackStr === null || endStackStr === undefined) {
    return { error: "Missing game ID or end stack." }
  }

  const endStackNum = Number(endStackStr);
  if (isNaN(endStackNum)) {
      return { error: "Invalid end stack value." }
  }

  const updateData: GameUpdate = {
    end_stack: endStackNum,
    end_time: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("games")
    .update(updateData)
    .eq("id", gameId)
    .eq("user_id", userId) 

  if (error) {
    console.error("End Game Error:", error)
    return { error: `Failed to end game: ${error.message}` }
  }

  revalidatePath("/")
  revalidatePath("/history")
  revalidatePath("/analytics")
  return { success: true }
}

// Get active games
export async function getActiveGames(): Promise<{ data?: Game[], error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })

    if (error) throw error
    return { data: data || [] }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get game history (paginated)
export async function getGameHistory(page = 0, pageSize = 25): Promise<{ data?: Game[], count?: number, error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const { data, count, error } = await supabase
      .from("games")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .not("end_stack", "is", null)
      .order("end_time", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    return { data: data || [], count: count ?? 0 }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get weekly stats
export async function getWeekStats(): Promise<{ data?: { totalProfit: number, totalHours: number }, error?: string }> {
  try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const startOfWeek = getStartOfWeek().toISOString()

    const { data, error } = await supabase
      .from("games")
      .select("start_time, end_time, start_stack, end_stack")
      .eq("user_id", userId)
      .gte("end_time", startOfWeek)
      .not("end_time", "is", null)
      .not("end_stack", "is", null)

    if (error) throw error

    let totalProfit = 0;
    let totalHours = 0;
    (data || []).forEach(g => {
      totalProfit += (g.end_stack ?? 0) - (g.start_stack ?? 0)
      if (g.start_time && g.end_time) totalHours += getHoursDifference(g.start_time, g.end_time)
    })

    return { data: { totalProfit, totalHours: Math.round(totalHours * 100) / 100 } }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Get chart data
export async function getChartData(periodDays: number): Promise<{ data?: any[], error?: string }> {
   try {
    const userId = await checkAuth()
    const supabase = createSrvClient()
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - periodDays)

    const { data, error } = await supabase
        .from("games")
        .select("start_stack, end_stack, start_time, end_time")
        .eq("user_id", userId)
        .gte("end_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())
        .not("end_time", "is", null)
        .not("end_stack", "is", null)
        .order("end_time", { ascending: true })

    if (error) throw error
    return { data: data || [] }
   } catch (err: any) {
     return { error: err.message }
   }
}