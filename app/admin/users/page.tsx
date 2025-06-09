"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Loader2, ArrowLeft, Search, UserCheck, UserX } from "lucide-react"
import { format } from "date-fns"

interface User {
  id: number
  username: string
  first_name: string | null
  last_name: string | null
  status: string
  role_id: number
  created_at: string
  roles?: {
    name: string
  }
}

export default function UsersManagementPage() {
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    status: "active",
    password: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

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
        await fetchUsers()
      } catch (error) {
        console.error("Error in users management:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkAdminSession()
  }, [router])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*, roles(name)")
        .eq("role_id", 2) // Only drivers
        .order("first_name")

      if (error) throw error

      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    }
  }

  // Filter users based on search and status
  useEffect(() => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUser) return

    setSubmitting(true)

    try {
      const updateData: any = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        status: formData.status,
      }

      // Only update password if provided
      if (formData.password) {
        updateData.password_hash = formData.password // In a real app, this would be hashed
      }

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", selectedUser.id)
        .select("*, roles(name)")
        .single()

      if (error) throw error

      // Update local state
      setUsers(users.map((u) => (u.id === selectedUser.id ? data : u)))
      setIsEditDialogOpen(false)

      toast({
        title: "User Updated",
        description: `${data.first_name} ${data.last_name} has been updated successfully`,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      setUsers(users.filter((u) => u.id !== userId))

      toast({
        title: "User Deleted",
        description: `${userName} has been deleted successfully`,
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user. They may have associated entries.",
        variant: "destructive",
      })
    }
  }

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"

    try {
      const { data, error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", userId)
        .select("*, roles(name)")
        .single()

      if (error) throw error

      setUsers(users.map((u) => (u.id === userId ? data : u)))

      toast({
        title: "Status Updated",
        description: `User status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading users management...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader username={user.username} isAdmin={true} />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push("/admin/dashboard")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => router.push("/admin/users/new")} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Driver
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          {!user.first_name && !user.last_name && (
                            <p className="text-sm text-muted-foreground">No name set</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), "PP")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            title={user.status === "active" ? "Deactivate user" : "Activate user"}
                          >
                            {user.status === "active" ? (
                              <UserX className="h-4 w-4 text-orange-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>

                          <Dialog
                            open={isEditDialogOpen && selectedUser?.id === user.id}
                            onOpenChange={(open) => {
                              setIsEditDialogOpen(open)
                              if (!open) setSelectedUser(null)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setFormData({
                                    username: user.username,
                                    first_name: user.first_name || "",
                                    last_name: user.last_name || "",
                                    status: user.status,
                                    password: "", // Don't populate password for security
                                  })
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Driver</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleEditUser} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit_first_name">
                                      First Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="edit_first_name"
                                      value={formData.first_name}
                                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit_last_name">
                                      Last Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="edit_last_name"
                                      value={formData.last_name}
                                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_username">
                                    Username <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="edit_username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_password">
                                    Password{" "}
                                    <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>
                                  </Label>
                                  <Input
                                    id="edit_password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit_status">Status</Label>
                                  <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={submitting}>
                                    {submitting ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      "Save Changes"
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteUser(user.id, `${user.first_name} ${user.last_name}` || user.username)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">
                          {searchTerm || statusFilter !== "all"
                            ? "No users found with current filters."
                            : "No drivers found. Add your first driver to get started."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} drivers
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
