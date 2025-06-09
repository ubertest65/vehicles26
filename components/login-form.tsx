"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Fingerprint, User } from "lucide-react"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [savedCredentials, setSavedCredentials] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check if biometric authentication is available
    if ("credentials" in navigator && "create" in navigator.credentials) {
      setBiometricAvailable(true)
    }

    // Check for saved credentials
    const saved = localStorage.getItem("saved_credentials")
    if (saved) {
      setSavedCredentials(JSON.parse(saved))
    }

    // Check for existing session
    const userSession = localStorage.getItem("user_session")
    if (userSession) {
      router.push("/dashboard")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Attempting login for:", username)

      // Check if user exists in our custom users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, username, password_hash, role_id")
        .eq("username", username)
        .single()

      console.log("User query result:", userData, userError)

      if (userError || !userData) {
        throw new Error("Invalid username or password")
      }

      // Simple password check (in production, you'd use proper hashing)
      if (userData.password_hash !== password) {
        throw new Error("Invalid username or password")
      }

      console.log("Password verified, creating session")

      // Create a session token
      const sessionToken = crypto.randomUUID()

      // Store session in database
      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: userData.id,
        token: sessionToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })

      if (sessionError) {
        console.error("Session error:", sessionError)
      }

      // Store user info in localStorage for client-side auth
      const userSession = {
        id: userData.id,
        username: userData.username,
        role_id: userData.role_id,
        token: sessionToken,
      }

      localStorage.setItem("user_session", JSON.stringify(userSession))

      // Save credentials for biometric login (if user agrees)
      if (biometricAvailable && !savedCredentials) {
        const saveCredentials = confirm("Would you like to save your login for faster access with Face ID/Touch ID?")
        if (saveCredentials) {
          localStorage.setItem("saved_credentials", JSON.stringify({ username, password }))
        }
      }

      console.log("Session created, redirecting to dashboard")

      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.username}!`,
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    if (!savedCredentials) return

    try {
      setLoading(true)

      // In a real implementation, you'd use WebAuthn API
      // For now, we'll simulate biometric authentication
      const confirmed = confirm("Use saved credentials to log in?")
      if (!confirmed) return

      // Auto-fill and submit
      setUsername(savedCredentials.username)
      setPassword(savedCredentials.password)

      // Trigger login with saved credentials
      const event = { preventDefault: () => {} } as React.FormEvent
      await handleLogin(event)
    } catch (error) {
      console.error("Biometric login error:", error)
      toast({
        title: "Biometric Login Failed",
        description: "Please try manual login",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access the vehicle tracker</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Login
              </>
            )}
          </Button>

          {savedCredentials && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleBiometricLogin}
              disabled={loading}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Quick Login
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
