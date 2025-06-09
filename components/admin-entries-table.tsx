"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"

interface EntryWithDetails {
  id: number
  created_at: string
  mileage: number
  notes: string | null
  user: {
    id: number
    first_name: string
    last_name: string
    username: string
    status: string
  }
  vehicle: {
    license_plate: string
    model: string
  }
  photos: {
    id: number
    image_url: string
    photo_type: string
  }[]
}

interface AdminEntriesTableProps {
  filters: {
    drivers: string[]
    vehicles: string[]
    dateFrom: string
    dateTo: string
    status: string[]
  }
}

export default function AdminEntriesTable({ filters }: AdminEntriesTableProps) {
  const [entries, setEntries] = useState<EntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<EntryWithDetails | null>(null)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalEntries, setTotalEntries] = useState(0)

  const supabase = createClient()

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  const fetchEntries = async () => {
    setLoading(true)

    try {
      let query = supabase.from("vehicle_entries").select(`
          id,
          created_at,
          mileage,
          notes,
          user:user_id (
            id,
            first_name,
            last_name,
            username,
            status
          ),
          vehicle:vehicle_id (
            license_plate,
            model
          ),
          photos (
            id,
            image_url,
            photo_type
          )
        `)

      // Apply filters
      if (filters.drivers.length > 0) {
        query = query.in(
          "user_id",
          filters.drivers.map((id) => Number.parseInt(id)),
        )
      }

      if (filters.vehicles.length > 0) {
        query = query.in(
          "vehicle_id",
          filters.vehicles.map((id) => Number.parseInt(id)),
        )
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", `${filters.dateFrom}T00:00:00`)
      }

      if (filters.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59`)
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === "asc" })

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Filter by user status (since we can't do this in the query directly due to the join)
      const filteredData =
        data?.filter(
          (entry) => filters.status.length === 0 || filters.status.includes(entry.user?.status || "active"),
        ) || []

      setEntries(filteredData)
      setTotalEntries(count || 0)
    } catch (error) {
      console.error("Error fetching entries:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [filters, sortField, sortDirection, currentPage, itemsPerPage])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const totalPages = Math.ceil(totalEntries / itemsPerPage)

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading entries...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {entries.length} of {totalEntries} entries
            </p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number.parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("user.first_name")}>
                  <div className="flex items-center gap-2">
                    Driver Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-2">
                    Date & Time
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("mileage")}>
                  <div className="flex items-center gap-2">
                    Mileage
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {entry.user?.first_name} {entry.user?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{entry.user?.username}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.vehicle.license_plate} - {entry.vehicle.model}
                  </TableCell>
                  <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                  <TableCell>{entry.mileage.toLocaleString()} km</TableCell>
                  <TableCell>
                    <Badge variant={entry.user?.status === "active" ? "default" : "secondary"}>
                      {entry.user?.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEntry(entry)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Vehicle Entry Details</DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Driver</p>
                                <p>
                                  {selectedEntry.user?.first_name} {selectedEntry.user?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">({selectedEntry.user?.username})</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Vehicle</p>
                                <p>
                                  {selectedEntry.vehicle.license_plate} - {selectedEntry.vehicle.model}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Date & Time</p>
                                <p>{formatDateTime(selectedEntry.created_at)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Mileage</p>
                                <p>{selectedEntry.mileage.toLocaleString()} km</p>
                              </div>
                            </div>

                            {selectedEntry.notes && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-sm font-medium">Notes</p>
                                  <p className="mt-1">{selectedEntry.notes}</p>
                                </div>
                              </>
                            )}

                            <Separator />

                            <Tabs defaultValue="required">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="required">Required Photos</TabsTrigger>
                                <TabsTrigger value="optional">
                                  Optional Photos
                                  {selectedEntry.photos.filter((p) => p.photo_type === "optional").length > 0 && (
                                    <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-2">
                                      {selectedEntry.photos.filter((p) => p.photo_type === "optional").length}
                                    </span>
                                  )}
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="required" className="mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {["vorne_links", "vorne_rechts", "hinten_links", "hinten_rechts"].map((type) => {
                                    const photo = selectedEntry.photos.find((p) => p.photo_type === type)
                                    const label = {
                                      vorne_links: "Front Left",
                                      vorne_rechts: "Front Right",
                                      hinten_links: "Rear Left",
                                      hinten_rechts: "Rear Right",
                                    }[type]

                                    return (
                                      <div key={type} className="space-y-1">
                                        <p className="text-xs font-medium">{label}</p>
                                        {photo ? (
                                          <img
                                            src={photo.image_url || "/placeholder.svg"}
                                            alt={`${label} view`}
                                            className="aspect-video w-full object-cover rounded-md border"
                                          />
                                        ) : (
                                          <div className="aspect-video w-full bg-muted flex items-center justify-center rounded-md border">
                                            <p className="text-sm text-muted-foreground">No photo</p>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </TabsContent>
                              <TabsContent value="optional" className="mt-4">
                                <div className="grid grid-cols-3 gap-2">
                                  {selectedEntry.photos
                                    .filter((p) => p.photo_type === "optional")
                                    .map((photo) => (
                                      <img
                                        key={photo.id}
                                        src={photo.image_url || "/placeholder.svg"}
                                        alt="Optional photo"
                                        className="aspect-square w-full object-cover rounded-md border"
                                      />
                                    ))}

                                  {selectedEntry.photos.filter((p) => p.photo_type === "optional").length === 0 && (
                                    <div className="col-span-3 h-32 flex items-center justify-center">
                                      <p className="text-muted-foreground">No optional photos</p>
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}

              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No entries found with the current filters.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
