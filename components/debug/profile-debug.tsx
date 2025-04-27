"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function ProfileDebug() {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      setUser(userData.user)

      if (!userData.user) return

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError
      }

      setProfile(profileData)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Debug Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">User:</h3>
            {loading ? (
              <div className="animate-pulse h-4 bg-muted rounded w-full"></div>
            ) : user ? (
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
            ) : (
              <p className="text-muted-foreground">Not logged in</p>
            )}
          </div>

          <div>
            <h3 className="font-medium">Profile:</h3>
            {loading ? (
              <div className="animate-pulse h-4 bg-muted rounded w-full"></div>
            ) : profile ? (
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">No profile found</p>
                <p className="text-xs text-muted-foreground">
                  Profile creation is handled automatically by the server. Try refreshing the page.
                </p>
              </div>
            )}
          </div>

          <Button size="sm" onClick={fetchData} disabled={loading}>
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
