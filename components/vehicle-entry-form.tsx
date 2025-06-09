"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Camera, Upload, Loader2, X, CheckCircle } from "lucide-react"

interface Vehicle {
  id: number
  license_plate: string
  model: string
}

interface VehicleEntryFormProps {
  userId?: number
  vehicles: Vehicle[]
}

const REQUIRED_PHOTO_TYPES = [
  { id: "vorne_links", label: "Vorne Links" },
  { id: "vorne_rechts", label: "Vorne Rechts" },
  { id: "hinten_links", label: "Hinten Links" },
  { id: "hinten_rechts", label: "Hinten Rechts" },
]

export default function VehicleEntryForm({ userId, vehicles = [] }: VehicleEntryFormProps) {
  const [vehicleId, setVehicleId] = useState<string>("")
  const [mileage, setMileage] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    vorne_links: null,
    vorne_rechts: null,
    hinten_links: null,
    hinten_rechts: null,
  })
  const [optionalPhotos, setOptionalPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handlePhotoChange = (type: string, file: File | null) => {
    if (file) {
      // Chrome-specific: Validate file before processing
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Ungültige Datei",
          description: "Bitte wählen Sie eine gültige Bilddatei aus",
          variant: "destructive",
        })
        return
      }

      setPhotos((prev) => ({ ...prev, [type]: file }))

      // Create preview URL with Chrome-specific handling
      try {
        const url = URL.createObjectURL(file)
        setPhotoPreview((prev) => ({ ...prev, [type]: url }))
      } catch (error) {
        console.error("Error creating preview URL:", error)
        toast({
          title: "Vorschaufehler",
          description: "Bildvorschau konnte nicht erstellt werden",
          variant: "destructive",
        })
      }
    } else {
      setPhotos((prev) => ({ ...prev, [type]: null }))
      setPhotoPreview((prev) => {
        const newPreviews = { ...prev }
        if (newPreviews[type]) {
          // Chrome-specific: Properly revoke object URLs
          URL.revokeObjectURL(newPreviews[type])
          delete newPreviews[type]
        }
        return newPreviews
      })
    }
  }

  const handleOptionalPhotoAdd = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files)
      setOptionalPhotos((prev) => [...prev, ...newFiles])

      // Create preview URLs for optional photos
      newFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file)
        setPhotoPreview((prev) => ({
          ...prev,
          [`optional-${optionalPhotos.length + index}`]: url,
        }))
      })
    }
  }

  const removeOptionalPhoto = (index: number) => {
    setOptionalPhotos((prev) => prev.filter((_, i) => i !== index))

    // Update previews
    const newPreviews = { ...photoPreview }
    delete newPreviews[`optional-${index}`]

    // Reindex remaining optional photos
    const remainingOptionalPreviews: Record<string, string> = {}
    Object.entries(newPreviews).forEach(([key, value]) => {
      if (key.startsWith("optional-")) {
        const oldIndex = Number.parseInt(key.split("-")[1])
        if (oldIndex > index) {
          remainingOptionalPreviews[`optional-${oldIndex - 1}`] = value
        } else if (oldIndex < index) {
          remainingOptionalPreviews[key] = value
        }
      } else {
        remainingOptionalPreviews[key] = value
      }
    })

    setPhotoPreview(remainingOptionalPreviews)
  }

  const uploadPhoto = async (file: File, fileName: string): Promise<string> => {
    console.log(`Uploading file: ${fileName}`)

    // Chrome-specific: Ensure file is properly read
    const fileBuffer = await file.arrayBuffer()
    const blob = new Blob([fileBuffer], { type: file.type })

    const { data, error } = await supabase.storage.from("vehicle-photos").upload(fileName, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type, // Explicitly set content type for Chrome
    })

    if (error) {
      console.error("Upload error:", error)
      throw new Error(`Upload fehlgeschlagen: ${error.message}`)
    }

    console.log("Upload successful:", data)

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("vehicle-photos").getPublicUrl(fileName)

    console.log("Public URL:", publicUrlData.publicUrl)
    return publicUrlData.publicUrl
  }

  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return {
      date: `${day}.${month}.${year}`,
      time: `${hours}:${minutes}`,
      timestamp: date.toISOString(),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Chrome-specific: Additional validation
    if (!navigator.onLine) {
      toast({
        title: "Keine Internetverbindung",
        description: "Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (!vehicleId || !mileage) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie ein Fahrzeug aus und geben Sie den Kilometerstand ein",
        variant: "destructive",
      })
      return
    }

    // Validate required photos with Chrome-specific checks
    const missingPhotos = Object.entries(photos).filter(([_, file]) => !file)
    if (missingPhotos.length > 0) {
      toast({
        title: "Fehlende Fotos",
        description: "Bitte machen Sie alle vier erforderlichen Fotos",
        variant: "destructive",
      })
      return
    }

    // Chrome-specific: Validate all files are still valid
    for (const [type, file] of Object.entries(photos)) {
      if (file && (file.size === 0 || !file.type.startsWith("image/"))) {
        toast({
          title: "Ungültiges Foto",
          description: `Das ${type} Foto scheint beschädigt zu sein. Bitte machen Sie es erneut.`,
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)

    try {
      console.log("Creating vehicle entry...")

      const currentDateTime = formatDateTime(new Date())

      // 1. Create vehicle entry with formatted timestamp
      const { data: entry, error: entryError } = await supabase
        .from("vehicle_entries")
        .insert({
          user_id: userId,
          vehicle_id: Number.parseInt(vehicleId),
          mileage: Number.parseInt(mileage),
          notes: notes || null,
          created_at: currentDateTime.timestamp,
        })
        .select()
        .single()

      if (entryError) {
        console.error("Entry error:", entryError)
        throw new Error(`Eintrag konnte nicht erstellt werden: ${entryError.message}`)
      }

      console.log("Entry created:", entry)

      // 2. Upload required photos
      for (const [type, file] of Object.entries(photos)) {
        if (!file) continue

        try {
          const fileExt = file.name.split(".").pop() || "jpg"
          const fileName = `${userId}-${entry.id}-${type}-${Date.now()}.${fileExt}`

          console.log(`Uploading ${type} photo...`)
          const imageUrl = await uploadPhoto(file, fileName)

          // Save photo record
          const { error: photoError } = await supabase.from("photos").insert({
            entry_id: entry.id,
            image_url: imageUrl,
            photo_type: type,
          })

          if (photoError) {
            console.error(`Photo record error for ${type}:`, photoError)
            throw new Error(`${type} Foto konnte nicht gespeichert werden: ${photoError.message}`)
          }

          console.log(`${type} photo saved successfully`)
        } catch (error) {
          console.error(`Error with ${type} photo:`, error)
          throw error
        }
      }

      // 3. Upload optional photos
      for (let i = 0; i < optionalPhotos.length; i++) {
        const file = optionalPhotos[i]

        try {
          const fileExt = file.name.split(".").pop() || "jpg"
          const fileName = `${userId}-${entry.id}-optional-${i}-${Date.now()}.${fileExt}`

          console.log(`Uploading optional photo ${i + 1}...`)
          const imageUrl = await uploadPhoto(file, fileName)

          // Save photo record
          const { error: photoError } = await supabase.from("photos").insert({
            entry_id: entry.id,
            image_url: imageUrl,
            photo_type: "optional",
          })

          if (photoError) {
            console.error(`Optional photo record error:`, photoError)
            throw new Error(`Optionales Foto konnte nicht gespeichert werden: ${photoError.message}`)
          }

          console.log(`Optional photo ${i + 1} saved successfully`)
        } catch (error) {
          console.error(`Error with optional photo ${i + 1}:`, error)
          throw error
        }
      }

      // Show success message
      setShowSuccess(true)

      toast({
        title: "Eintrag erfolgreich gespeichert!",
        description: `Fahrzeugzustand am ${currentDateTime.date} um ${currentDateTime.time} Uhr erfasst`,
      })

      // Reset form after a short delay
      setTimeout(() => {
        setVehicleId("")
        setMileage("")
        setNotes("")
        setPhotos({
          vorne_links: null,
          vorne_rechts: null,
          hinten_links: null,
          hinten_rechts: null,
        })
        setOptionalPhotos([])
        setPhotoPreview({})
        setShowSuccess(false)

        // Refresh the page
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Submit error:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fahrzeugeintrag konnte nicht gespeichert werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Chrome-specific: Cleanup object URLs on unmount
    return () => {
      Object.values(photoPreview).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

  if (showSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Eintrag erfolgreich gespeichert!</h3>
            <p className="text-muted-foreground">Seite wird neu geladen...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-1">
              Fahrzeug <span className="text-red-500">*</span>
            </Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Fahrzeug auswählen" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                    {vehicle.license_plate} - {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage" className="flex items-center gap-1">
              Kilometerstand (km) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mileage"
              type="number"
              min="0"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Schäden oder Probleme zu melden?"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-1">
              Erforderliche Fotos <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {REQUIRED_PHOTO_TYPES.map((type) => (
                <div key={type.id} className="space-y-2">
                  <Label htmlFor={`photo-${type.id}`} className="flex items-center gap-1">
                    {type.label} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    {photoPreview[type.id] ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                        <img
                          src={photoPreview[type.id] || "/placeholder.svg"}
                          alt={`${type.label} Vorschau`}
                          className="object-cover w-full h-full"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 right-2"
                          onClick={() => handlePhotoChange(type.id, null)}
                        >
                          Ändern
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor={`photo-${type.id}`}
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-red-300 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Foto aufnehmen</span>
                        <input
                          id={`photo-${type.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoChange(type.id, e.target.files?.[0] || null)}
                          required
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Optionale Fotos</Label>
            <div className="grid grid-cols-3 gap-2">
              {optionalPhotos.map((file, index) => (
                <div key={index} className="relative aspect-square w-full overflow-hidden rounded-md border">
                  <img
                    src={photoPreview[`optional-${index || "/placeholder.svg"}`] || "/placeholder.svg"}
                    alt={`Optionales Foto ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => removeOptionalPhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square w-full border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Foto hinzufügen</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleOptionalPhotoAdd(e.target.files)}
                />
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eintrag wird gespeichert...
              </>
            ) : (
              "Fahrzeugeintrag speichern"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
