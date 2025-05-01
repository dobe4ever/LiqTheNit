// profiles table
export interface profilesTable {
    id: string
    username: string
}

// sessions table 
export interface sessionsTable {
    id: string
    user_id: string
    start_time: string
    end_time: string
}

// games table 
export interface gamesTable {
    id: string
    session_id: string
    user_id: string
    game_type: string
    buy_in: number
    start_stack: number
    end_stack: number
    start_time: string
    end_time: string
}
