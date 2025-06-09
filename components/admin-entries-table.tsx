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
import { Eye, ArrowUpDown, ChevronLeft, ChevronRight, Download, X } from "lucide-react"

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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const supabase = createClient()

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}.${month}.${year} ${hours}:${minutes} Uhr`
  }

  const getPhotoTypeLabel = (photoType: string) => {
    const labels = {
      vorne_links: "Vorne Links",
      vorne_rechts: "Vorne Rechts",
      hinten_links: "Hinten Links",
      hinten_rechts: "Hinten Rechts",
      optional: "Optional",
    }
    return labels[photoType as keyof typeof labels] || photoType
  }

  const downloadPhoto = async (
    imageUrl: string,
    entry: EntryWithDetails,
    photoType: string,
    optionalIndex?: number,
  ) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      const date = new Date(entry.created_at)
      const dateStr = `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`
      const timeStr = `${date.getHours().toString().padStart(2, "0")}.${date.getMinutes().toString().padStart(2, "0")}`

      let fileName = `${dateStr}_${timeStr}_${entry.vehicle.license_plate}_`

      if (photoType === "optional") {
        fileName += `optional${optionalIndex !== undefined ? optionalIndex + 1 : ""}.jpg`
      } else {
        const typeLabels = {
          vorne_links: "vorne_links",
          vorne_rechts: "vorne_rechts",
          hinten_links: "hinten_links",
          hinten_rechts: "hinten_rechts",
        }
        fileName += `${typeLabels[photoType as keyof typeof typeLabels] || photoType}.jpg`
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const openLightbox = (imageUrl: string, allImages: string[]) => {
    setLightboxImages(allImages)
    setCurrentImageIndex(allImages.indexOf(imageUrl))
    setLightboxImage(imageUrl)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    setLightboxImages([])
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    if (currentImageIndex < lightboxImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
      setLightboxImage(lightboxImages[currentImageIndex + 1])
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
      setLightboxImage(lightboxImages[currentImageIndex - 1])
    }
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
            <p>Einträge werden geladen...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Zeige {entries.length} von {totalEntries} Einträgen
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
                  <SelectItem value="10">10 pro Seite</SelectItem>
                  <SelectItem value="20">20 pro Seite</SelectItem>
                  <SelectItem value="50">50 pro Seite</SelectItem>
                  <SelectItem value="100">100 pro Seite</SelectItem>
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
                      Fahrer
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Fahrzeug</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center gap-2">
                      Datum & Uhrzeit
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("mileage")}>
                    <div className="flex items-center gap-2">
                      Kilometerstand
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
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
                        {entry.user?.status === "active" ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedEntry(entry)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Details anzeigen
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Fahrzeugeintrag Details</DialogTitle>
                          </DialogHeader>
                          {selectedEntry && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Fahrer</p>
                                  <p>
                                    {selectedEntry.user?.first_name} {selectedEntry.user?.last_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">({selectedEntry.user?.username})</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Fahrzeug</p>
                                  <p>
                                    {selectedEntry.vehicle.license_plate} - {selectedEntry.vehicle.model}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Datum & Uhrzeit</p>
                                  <p>{formatDateTime(selectedEntry.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Kilometerstand</p>
                                  <p>{selectedEntry.mileage.toLocaleString()} km</p>
                                </div>
                              </div>

                              {selectedEntry.notes && (
                                <>
                                  <Separator />
                                  <div>
                                    <p className="text-sm font-medium">Notizen</p>
                                    <p className="mt-1">{selectedEntry.notes}</p>
                                  </div>
                                </>
                              )}

                              <Separator />

                              <Tabs defaultValue="required">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="required">Erforderliche Fotos</TabsTrigger>
                                  <TabsTrigger value="optional">
                                    Optionale Fotos
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
                                      const label = getPhotoTypeLabel(type)

                                      return (
                                        <div key={type} className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium">{label}</p>
                                            {photo && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadPhoto(photo.image_url, selectedEntry, type)}
                                                className="h-6 px-2"
                                              >
                                                <Download className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                          {photo ? (
                                            <img
                                              src={photo.image_url || "/placeholder.svg"}
                                              alt={`${label} Ansicht`}
                                              className="aspect-video w-full object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                const allImages = selectedEntry.photos
                                                  .filter((p) =>
                                                    [
                                                      "vorne_links",
                                                      "vorne_rechts",
                                                      "hinten_links",
                                                      "hinten_rechts",
                                                    ].includes(p.photo_type),
                                                  )
                                                  .map((p) => p.image_url)
                                                openLightbox(photo.image_url, allImages)
                                              }}
                                            />
                                          ) : (
                                            <div className="aspect-video w-full bg-muted flex items-center justify-center rounded-md border">
                                              <p className="text-sm text-muted-foreground">Kein Foto</p>
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
                                      .map((photo, index) => (
                                        <div key={photo.id} className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium">Optional {index + 1}</p>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                downloadPhoto(photo.image_url, selectedEntry, "optional", index)
                                              }
                                              className="h-6 px-2"
                                            >
                                              <Download className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <img
                                            src={photo.image_url || "/placeholder.svg"}
                                            alt={`Optionales Foto ${index + 1}`}
                                            className="aspect-square w-full object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                              const allImages = selectedEntry.photos
                                                .filter((p) => p.photo_type === "optional")
                                                .map((p) => p.image_url)
                                              openLightbox(photo.image_url, allImages)
                                            }}
                                          />
                                        </div>
                                      ))}

                                    {selectedEntry.photos.filter((p) => p.photo_type === "optional").length === 0 && (
                                      <div className="col-span-3 h-32 flex items-center justify-center">
                                        <p className="text-muted-foreground">Keine optionalen Fotos</p>
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
                      <p className="text-muted-foreground">Keine Einträge mit den aktuellen Filtern gefunden.</p>
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
                Seite {currentPage} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="h-6 w-6" />
            </Button>

            {currentImageIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {currentImageIndex < lightboxImages.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="Vergrößerte Ansicht"
              className="max-w-full max-h-full object-contain"
            />

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
              {currentImageIndex + 1} von {lightboxImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
