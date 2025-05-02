import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getSupabaseServerClient } from "@/app/supabase/server"

export default async function AuthPage() {
  const supabase = getSupabaseServerClient()

  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <AuthForm />
    </div>
  )
}