"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils/date-formatter"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Session {
  id: string
  start_time: string
  end_time: string | null
}

export function SessionController() {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchActiveSession = async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/auth")
          return
        }

        // Now fetch the active session
        const { data, error } = await supabase
          .from("sessions")
          .select("id, start_time, end_time")
          .eq("user_id", userData.user.id)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .limit(1)

        if (error) {
          throw error
        }

        setActiveSession(data && data.length > 0 ? data[0] : null)
      } catch (error: any) {
        console.error("Error fetching active session:", error)
        toast({
          title: "Error",
          description: "Failed to fetch active session: " + error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchActiveSession()
  }, [router, toast, supabase])

  const toggleSession = async (checked: boolean) => {
    if (checked) {
      // Start session
      await startSession()
    } else {
      // End session
      await endSession()
    }
  }

  const startSession = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/auth")
        return
      }

      // Create session
      const { data, error } = await supabase
        .from("sessions")
        .insert([{ user_id: userData.user.id }])
        .select()

      if (error) {
        throw new Error("Failed to create session: " + error.message)
      }

      setActiveSession(data && data.length > 0 ? data[0] : null)
      toast({
        title: "Success",
        description: "Session started successfully.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error starting session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start session.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("id", activeSession.id)

      if (error) throw error

      setActiveSession(null)
      toast({
        title: "Success",
        description: "Session ended successfully.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error ending session:", error)
      toast({
        title: "Error",
        description: "Failed to end session.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center space-x-2">
        <Switch id="session-toggle" checked={!!activeSession} onCheckedChange={toggleSession} disabled={loading} />
        <Label htmlFor="session-toggle" className="cursor-pointer">
          {activeSession ? "Session Active" : "Session Inactive"}
        </Label>
      </div>

      {activeSession && (
        <div className="text-sm">
          <span className="text-muted-foreground">Since: </span>
          <span className="font-medium">{formatDateTime(activeSession.start_time)}</span>
        </div>
      )}
    </div>
  )
}