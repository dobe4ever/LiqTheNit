"use server"
// Remove: import { createClient, getUser } from "@/auth/server"
import type { Game } from "@/types/db"
import { createClient, getUser } from "@/auth/server" // Keep these imports

// Handle errors
const handleGameError = (error: any, context: string) => {
  console.error(`${context} Error:`, error.message)
  return { data: null, error: `Failed to ${context.toLowerCase()}.` }
}

// Start a new game
export async function startGame(data: FormData) {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { error: "Auth required." }

  const gameType = data.get("gameType") as string
  const buyIn = parseInt(data.get("buyIn") as string, 10)
  const startStack = parseInt(data.get("startStack") as string, 10)

  if (isNaN(buyIn) || isNaN(startStack)) return { error: "Invalid input." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.from("games").insert({
      user_id: user.id, game_type: gameType, buy_in: buyIn,
      start_stack: startStack, start_time: new Date().toISOString(),
    })
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    return handleGameError(error, "Start Game")
  }
}

// End an active game
export async function endGame(gameId: string, endStackStr: string) {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { error: "Auth required." }

  const endStack = parseInt(endStackStr, 10)
  if (isNaN(endStack)) return { error: "Invalid end stack." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.from("games").update({
      end_stack: endStack, end_time: new Date().toISOString()
    }).eq("id", gameId).eq("user_id", user.id)
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    return handleGameError(error, "End Game")
  }
}

// Get active games for current user
export async function getActiveGames(): Promise<{ data: Game[] | null, error: string | null }> {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { data: null, error: "Auth required." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { data, error } = await supabase.from("games").select("*")
      .eq("user_id", user.id).is("end_time", null)
      .order("start_time", { ascending: false })
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return handleGameError(error, "Fetch Active Games")
  }
}

// Get completed games (paginated)
export async function getDoneGames(page: number, size: number): Promise<{ data: Game[] | null, count: number | null, error: string | null }> {
  const user = await getUser() // <-- Call getUser INSIDE action
  if (!user) return { data: null, count: null, error: "Auth required." }

  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { data, count, error } = await supabase.from("games")
      .select("*", { count: "exact" }).eq("user_id", user.id)
      .not("end_time", "is", null).not("end_stack", "is", null)
      .order("end_time", { ascending: false })
      .range(page * size, (page + 1) * size - 1)
    if (error) throw error
    return { data, count, error: null }
  } catch (error: any) {
    console.error("Fetch Done Games Error:", error.message)
    return { data: null, count: null, error: "Failed to fetch history." }
  }
}

// Get games within a date range (for charts/stats)
export async function getGamesPeriod(start: string, end: string): Promise<{ data: Game[] | null, error: string | null }> {
    const user = await getUser() // <-- Call getUser INSIDE action
    if (!user) return { data: null, error: "Auth required." }

    const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
    try {
        const { data, error } = await supabase.from("games")
            .select("id, start_stack, end_stack, start_time, end_time")
            .eq("user_id", user.id).gte("end_time", start).lte("end_time", end)
            .not("end_time", "is", null).not("end_stack", "is", null)
            .order("end_time", { ascending: true })
        if (error) throw error
        return { data: null, error: null }
    } catch (error: any) {
        return handleGameError(error, "Fetch Games for Period")
    }
}