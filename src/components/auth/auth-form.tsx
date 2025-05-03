"use client"
import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Shorter names
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { signIn, signUp, googleSignIn } from "@/actions/auth" // Use actions
import { Logo } from "@/components/logo"

export function AuthForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  // Handle form submission using server actions
  const handleAction = (action: (formData: FormData) => Promise<any>, successMsg?: string) => {
    return (formData: FormData) => {
      startTransition(async () => {
        const result = await action(formData)
        if (result?.error) {
          toast({ title: "Error", description: result.error, variant: "destructive" })
        } else if (successMsg || result?.message) {
          toast({ title: "Success", description: successMsg || result.message })
          // No router.push needed for sign in/out, actions handle redirect
          // For sign up, stay on page to show message
          if (action !== signUp) router.refresh() // Refresh for state changes if not sign up
        } else {
           router.refresh() // Refresh on success if no message (e.g., Google redirect handled by action)
        }
      })
    }
  }

  const handleGoogle = () => {
      startTransition(async () => {
          const result = await googleSignIn()
          if (result?.error) {
              toast({ title: "Error", description: result.error, variant: "destructive" })
          }
          // Redirect is handled by the action if successful
      })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-col items-center">
        <Logo className="h-12 w-9" /> {/* Use renamed Logo */}
        <CardTitle className="text-2xl font-bold text-center">NIT</CardTitle>
        <CardDescription className="text-center">Track OFC poker progress</CardDescription> {/* Shortened */}
      </CardHeader>
      <Tabs defaultValue="signin">
        <TabsList className="mx-6 grid w- grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          {/* Use action prop for form */}
          <form action={handleAction(signIn)}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" name="email" type="email" placeholder="you@mail.com" required disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-in">Password</Label>
                <Input id="pass-in" name="password" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
              {/* Separator */}
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>
              <Button className="w-full" variant="outline" type="button" onClick={handleGoogle} disabled={isPending}>
                Google
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          {/* Use action prop for form */}
          <form action={handleAction(signUp)}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" name="email" type="email" placeholder="you@mail.com" required disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-up">Password</Label>
                <Input id="pass-up" name="password" type="password" required disabled={isPending} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "Signing up..." : "Sign Up"}
              </Button>
               {/* Separator */}
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>
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