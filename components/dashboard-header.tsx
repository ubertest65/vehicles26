"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Car, User, LogOut, Shield } from "lucide-react"

interface DashboardHeaderProps {
  username?: string
  isAdmin?: boolean
}

export default function DashboardHeader({ username, isAdmin = false }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    // Clear local storage
    localStorage.removeItem("user_session")

    // Optionally clear session from database
    // await supabase.from('sessions').delete().eq('token', userToken)

    router.push("/")
    router.refresh()
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6" />
          <span className="font-bold text-lg">Vehicle Tracker</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            Dashboard
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/dashboard" className="text-sm font-medium hover:underline flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Admin Dashboard
              </Link>
              <Link href="/admin/users" className="text-sm font-medium hover:underline">
                Manage Users
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">{username || "User"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
