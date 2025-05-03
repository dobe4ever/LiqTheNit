```
.
├── node_modules/
├── public/
├── src
│   ├── actions
│   │   ├── auth.ts
│   │   ├── games.ts
│   │   └── profiles.ts
│   ├── app
│   │   ├── (app)
│   │   │   ├── analytics
│   │   │   │   └── page.tsx
│   │   │   ├── history
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)
│   │   │   └── auth
│   │   │       ├── callback
│   │   │       │   └── route.ts
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── supabase
│   │       ├── admin.ts
│   │       ├── client.ts
│   │       └── server.ts
│   ├── auth
│   │   ├── client.ts
│   │   └── server.ts
│   ├── components
│   │   ├── analytics
│   │   │   ├── hours-chart.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   └── profit-chart.tsx
│   │   ├── auth
│   │   │   └── auth-form.tsx
│   │   ├── history
│   │   │   ├── bitcoin-price-display.tsx
│   │   │   ├── games-table.tsx
│   │   │   └── week-stats.tsx
│   │   ├── layout
│   │   │   ├── nav-user.tsx
│   │   │   ├── nav.tsx
│   │   │   └── theme-switch.tsx
│   │   ├── logo.tsx
│   │   ├── start
│   │   │   ├── active-games.tsx
│   │   │   └── game-form.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib
│   │   ├── date.ts
│   │   ├── num.ts
│   │   └── utils.ts
│   ├── services
│   │   └── btc.ts
│   └── types
│       └── db.ts
└── tsconfig.json
```

# Codebase Dump

### src/actions/auth.ts
```ts
"use server"
// Remove: import { createClient } from "@/auth/server"
import { redirect } from "next/navigation"
import { upsertProfile } from "./profiles"
import { createClient } from "@/auth/server" // Keep this import if getUser is used, or import inside functions

// Handle errors consistently
const handleAuthError = (error: any, context: string) => {
  console.error(`${context} Error:`, error.message)
  return { error: error.message || "An unexpected error occurred." }
}

// Sign in with email/password
export async function signIn(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign In")
  }
  redirect("/")
}

// Sign up with email/password
export async function signUp(data: FormData) {
  const email = data.get("email") as string
  const password = data.get("password") as string
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (!signUpData.user) throw new Error("User not created after sign up.")

    const profileResult = await upsertProfile(signUpData.user.id, email)
    if (profileResult.error) throw new Error(profileResult.error)

  } catch (error: any) {
    return handleAuthError(error, "Sign Up")
  }
  return { error: null, message: "Check email for confirmation." }
}

// Sign in with Google OAuth
export async function googleSignIn() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    })
    if (error) throw error
    if (data.url) redirect(data.url)
  } catch (error: any) {
    return handleAuthError(error, "Google Sign In")
  }
}

// Sign out
export async function signOut() {
  const supabase = await createClient() // <-- Create client INSIDE action
 // <-- Create client INSIDE action
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error: any) {
    return handleAuthError(error, "Sign Out")
  }
  redirect("/auth")
}
\`\`\`

### WARNING: src/actions/game.ts not found

### WARNING: src/actions/profile.ts not found

### src/app/(app)/analytics/page.tsx
```tsx
// src/app/(app)/analytics/page.tsx (AnalyticsPage)
import { PerformanceChart } from "@/components/analytics/performance-chart"
import { ProfitChart } from "@/components/analytics/profit-chart"
import { HoursChart } from "@/components/analytics/hours-chart"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default function AnalyticsPage() {
  return (
    // Use PageContainer as the outermost wrapper
    <PageContainer>
      {/* Row 1: PageHeader (Title + subline) */}
      <PageHeader title="Analytics" subtitle="Track your performance over time" />

      {/* Row 2: Performance chart */}
      <PerformanceChart />

      {/* Row 3: Profits chart */}
      <ProfitChart />

      {/* Row 4: Time played chart */}
      <HoursChart />
    </PageContainer>
  )
}
\`\`\`
