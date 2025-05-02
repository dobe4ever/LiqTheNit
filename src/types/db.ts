// src/types/db.ts
// Run: npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/db.ts
// Or manually define if needed:
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          user_id: string
          game_type: string
          buy_in: number
          start_stack: number
          end_stack: number | null
          start_time: string
          end_time: string | null
        }
        Insert: {
          id?: string
          user_id: string
          game_type: string
          buy_in: number
          start_stack: number
          end_stack?: number | null
          start_time?: string
          end_time?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: string
          buy_in?: number
          start_stack?: number
          end_stack?: number | null
          start_time?: string
          end_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string | null 
          created_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          email?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export row types for convenience
export type Game = Database["public"]["Tables"]["games"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]