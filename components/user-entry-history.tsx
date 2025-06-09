"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Eye, Car, Calendar, Gauge } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface EntryWithDetails {
  id: number
  created_at: string
  mileage: number
  notes: string | null
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

interface UserEntryHistoryProps {
  userId?: number
}

export default function UserEntryHistory({ userId }: UserEntryHistoryProps) {
  const [entries, setEntries] = useState<EntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<EntryWithDetails | null>(null)
  const supabase = createClientComponentClient()

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return {
      date: `${day}.${month}.${year}`,
      time: `${hours}:${minutes}`,
      full: `${day}.${month}.${year} ${hours}:${minutes}`,
    }
  }

  useEffect(() => {
    const fetchEntries = async () => {
      if (!userId) return

      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("vehicle_entries")
          .select(`
            id,
            created_at,
            mileage,
            notes,
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
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        setEntries(data || [])
      } catch (error) {
        console.error("Error fetching entries:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
  }, [userId, supabase])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading your entries...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col justify-center items-center h-64 text-center">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No entries yet</h3>
            <p className="text-muted-foreground mt-2">Your vehicle condition entries will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {entries.map((entry) => {
              const dateTime = formatDateTime(entry.created_at)
              return (
                <div key={entry.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {entry.vehicle.license_plate} - {entry.vehicle.model}
                      </h3>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {dateTime.full}
                      </div>
                      <div className="text-sm mt-1 flex items-center gap-2">
                        <Gauge className="h-3 w-3" />
                        {entry.mileage.toLocaleString()} km
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEntry(entry)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Vehicle Entry Details</DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium">Vehicle</p>
                                <p>
                                  {selectedEntry.vehicle.license_plate} - {selectedEntry.vehicle.model}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Date & Time</p>
                                <p>{formatDateTime(selectedEntry.created_at).full}</p>
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
                                            className="aspect-video w-full object-cover rounded-md"
                                          />
                                        ) : (
                                          <div className="aspect-video w-full bg-muted flex items-center justify-center rounded-md">
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
                                        className="aspect-square w-full object-cover rounded-md"
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
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
