// src/components/start/game-form.tsx
"use client"
import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardFooter, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { startGame } from "@/actions/game" // Import action
import { getBrowserClient } from "@/auth/client" // Only for checking initial auth state

export function GameForm() {
  const [gameType, setGameType] = useState<string>("regular")
  const [buyIn, setBuyIn] = useState<string>("100")
  const [startStack, setStartStack] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [isUser, setIsUser] = useState(false) // Still useful for conditional render
  const { toast } = useToast()
  const supabase = getBrowserClient() // Get client

  // Check auth state on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsUser(!!user)
    }
    checkUser()
     // Listen for auth changes if needed, though actions handle auth internally
     const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
       setIsUser(!!session?.user)
     })
     return () => { authListener.subscription.unsubscribe() }
  }, [supabase])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isUser) {
      toast({ title: "Error", description: "Log in first.", variant: "destructive" })
      return
    }
    if (!startStack) {
      toast({ title: "Error", description: "Enter start stack.", variant: "destructive" })
      return
    }

    const formData = new FormData(e.currentTarget)
    // Add selected values manually if not directly named in form
    formData.set('gameType', gameType)
    formData.set('buyIn', buyIn)

    startTransition(async () => {
      const result = await startGame(formData)
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Game started." })
        setStartStack("") // Reset form field
      }
    })
  }

  if (!isUser) {
    return (
      <Card>
        <CardHeader><CardTitle>New Game</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Log in to start.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Start New Game</CardTitle></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Game Type Select */}
           <div className="space-y-2">
            <Label htmlFor="game-type">Type</Label>
            <Select name="gameType" value={gameType} onValueChange={setGameType} disabled={isPending}>
              <SelectTrigger id="game-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Buy In Select */}
           <div className="space-y-2">
            <Label htmlFor="buy-in">Buy In (µ)</Label>
            <Select name="buyIn" value={buyIn} onValueChange={setBuyIn} disabled={isPending}>
              <SelectTrigger id="buy-in"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Start Stack Input */}
           <div className="space-y-2">
            <Label htmlFor="start-stack">Start Stack (µ)</Label>
            <Input name="startStack" id="start-stack" type="number" value={startStack} onChange={(e) => setStartStack(e.target.value)} placeholder="Enter stack" disabled={isPending} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : "Start Game"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}