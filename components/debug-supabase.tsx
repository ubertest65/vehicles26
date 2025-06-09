"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugSupabase() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const testConnection = async () => {
    setLoading(true)
    setResult("Testing connection...")

    try {
      // Test basic connection
      const { data, error } = await supabase.from("roles").select("*")

      if (error) {
        setResult(`Error: ${error.message}`)
      } else {
        setResult(`Success! Found ${data?.length || 0} roles: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      setResult(`Connection failed: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testUsers = async () => {
    setLoading(true)
    setResult("Testing users table...")

    try {
      const { data, error } = await supabase.from("users").select("*")

      if (error) {
        setResult(`Users Error: ${error.message}`)
      } else {
        setResult(`Users Success! Found ${data?.length || 0} users: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      setResult(`Users test failed: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Debug Supabase Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testConnection} disabled={loading}>
            Test Roles Table
          </Button>
          <Button onClick={testUsers} disabled={loading}>
            Test Users Table
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gray-100 rounded-md">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>
            <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set"}
          </p>
          <p>
            <strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
