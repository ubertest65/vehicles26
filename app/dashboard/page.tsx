"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import DashboardHeader from "@/components/dashboard-header"
import VehicleEntryForm from "@/components/vehicle-entry-form"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

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

        // Fetch vehicles
        const { data: vehiclesData } = await supabase
          .from("vehicles")
          .select("id, license_plate, model")
          .eq("status", "aktiv")
          .order("license_plate")

        console.log("Vehicles fetched:", vehiclesData)
        setVehicles(vehiclesData || [])
      } catch (error) {
        console.error("Error in dashboard:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader username={user.username} isAdmin={user.role_id === 1} />
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Vehicle Condition Tracker</h1>
          <Button variant="outline" onClick={() => router.push("/history")} className="flex items-center gap-2">
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">New Vehicle Entry</h2>
            <VehicleEntryForm userId={user.id} vehicles={vehicles} />
          </div>
        </div>
      </div>
    </main>
  )
}
