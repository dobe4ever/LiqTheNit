import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getUser } from "@/auth/server" // Use centralized getter

export default async function AuthPage() {
  const user = await getUser()
  if (user) redirect("/") // Redirect if already logged in

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <AuthForm />
    </div>
  )
}