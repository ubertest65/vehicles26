"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import UserEntryHistory from "@/components/user-entry-history"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for user session
    const checkSession = async () => {
      try {
        const userSession = localStorage.getItem("user_session")
        if (!userSession) {
          console.log("No session found, redirecting to login")
          router.push("/")
          return
        }

        const userData = JSON.parse(userSession)
        console.log("User session found:", userData)
        setUser(userData)
      } catch (error) {
        console.error("Error in history page:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading history...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader username={user.username} isAdmin={user.role_id === 1} />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Entry History</h1>
        </div>

        <UserEntryHistory userId={user.id} />
      </div>
    </main>
  )
}
