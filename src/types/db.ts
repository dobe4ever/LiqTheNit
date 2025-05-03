// Define Supabase table types
export interface Profile {
  id: string
  username: string | null
  email: string | null
  created_at: string
}

export interface Game {
  id: string
  user_id: string
  game_type: string
  buy_in: number
  start_stack: number
  end_stack: number | null
  start_time: string
  end_time: string | null
  updated_at: string
}

// Add other table types if needed