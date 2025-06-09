"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import AdminEntriesTable from "@/components/admin-entries-table"
import AdminFilters from "@/components/admin-filters"
import AdminVehicleList from "@/components/admin-vehicle-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    drivers: [] as string[],
    vehicles: [] as string[],
    dateFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days ago
    dateTo: new Date().toISOString().split("T")[0], // today
    status: ["active"] as string[],
  })
  const router = useRouter()

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const userSession = localStorage.getItem("user_session")
        if (!userSession) {
          router.push("/")
          return
        }

        const userData = JSON.parse(userSession)

        // Check if user is admin (role_id = 1)
        if (userData.role_id !== 1) {
          router.push("/dashboard")
          return
        }

        setUser(userData)
      } catch (error) {
        console.error("Error in admin dashboard:", error)
      }
    }

    checkAdminSession()
    setLoading(false)
  }, [router])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div>
      <DashboardHeader />
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>
        <TabsContent value="entries">
          <AdminFilters filters={filters} setFilters={setFilters} />
          <AdminEntriesTable filters={filters} />
        </TabsContent>
        <TabsContent value="vehicles">
          <AdminVehicleList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
