// src/components/auth/auth-form.tsx
"use client"
import { LogoSymbol } from "@/components/logo-symbol"
import { useState, useTransition } from "react" // Use useTransition
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names if available
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { signIn, signUp, googleSignIn } from "@/actions/auth" // Import actions

export function AuthForm() {
  const [isPending, startTransition] = useTransition() // Pending state for actions
  const { toast } = useToast()

  const handleAction = (action: (formData: FormData) => Promise<any>) => {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      startTransition(async () => {
        const result = await action(formData)
        if (result?.error) {
          toast({ title: "Error", description: result.error, variant: "destructive" })
        } else if (result?.message) {
          toast({ title: "Success", description: result.message })
        }
        // Redirect handled by server action
      })
    }
  }

  const handleGoogle = () => {
     startTransition(async () => {
       const result = await googleSignIn()
       if (result?.error) toast({ title: "Google Error", description: result.error, variant: "destructive" })
       // Redirect handled by server action
     })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-col items-center">
        <LogoSymbol className="h-12 w-9" />
        <CardTitle className="text-2xl font-bold text-center">NIT</CardTitle>
        <CardDescription className="text-center">Track OFC progress</CardDescription>
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="mx-6 grid w- grid-cols-2">
          <TabsTrigger value="signin">In</TabsTrigger>
          <TabsTrigger value="signup">Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleAction(signIn)}> {/* Use action */}
            <CardContent className="space-y-4 pt-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input name="email" id="email-in" type="email" required disabled={isPending} />
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="pass-in">Password</Label>
                <Input name="password" id="pass-in" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "..." : "Sign In"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
           <form onSubmit={handleAction(signUp)}> {/* Use action */}
            <CardContent className="space-y-4 pt-4">
               {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input name="email" id="email-up" type="email" required disabled={isPending} />
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="pass-up">Password</Label>
                <Input name="password" id="pass-up" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "..." : "Sign Up"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}