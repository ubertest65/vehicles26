"use client"

import { CommandEmpty } from "@/components/ui/command"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandInput, CommandGroup, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterProps {
  filters: {
    drivers: string[]
    vehicles: string[]
    dateFrom: string
    dateTo: string
    status: string[]
  }
  onFiltersChange: (filters: any) => void
}

export default function AdminFilters({ filters, onFiltersChange }: FilterProps) {
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [openDrivers, setOpenDrivers] = useState(false)
  const [openVehicles, setOpenVehicles] = useState(false)
  const [openStatus, setOpenStatus] = useState(false)
  const supabase = createClientComponentClient()

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ]

  useEffect(() => {
    const fetchFilterData = async () => {
      // Fetch drivers
      const { data: driversData } = await supabase
        .from("users")
        .select("id, username, first_name, last_name, status")
        .eq("role_id", 2) // Only drivers
        .order("first_name")

      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("id, license_plate, model")
        .eq("status", "aktiv")
        .order("license_plate")

      setDrivers(driversData || [])
      setVehicles(vehiclesData || [])
    }

    fetchFilterData()
  }, [supabase])

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleMultiSelect = (key: string, value: string) => {
    const currentValues = filters[key as keyof typeof filters] as string[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]
    updateFilter(key, newValues)
  }

  const removeFilter = (key: string, value: string) => {
    const currentValues = filters[key as keyof typeof filters] as string[]
    updateFilter(
      key,
      currentValues.filter((v) => v !== value),
    )
  }

  const clearAllFilters = () => {
    onFiltersChange({
      drivers: [],
      vehicles: [],
      dateFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      dateTo: new Date().toISOString().split("T")[0],
      status: ["active"],
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Drivers Filter */}
          <div className="space-y-2">
            <Label>Drivers</Label>
            <Popover open={openDrivers} onOpenChange={setOpenDrivers}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDrivers}
                  className="w-full justify-between"
                >
                  {filters.drivers.length > 0 ? `${filters.drivers.length} selected` : "Select drivers..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search drivers..." />
                  <CommandList>
                    <CommandEmpty>No drivers found.</CommandEmpty>
                    <CommandGroup>
                      {drivers.map((driver) => (
                        <CommandItem
                          key={driver.id}
                          onSelect={() => toggleMultiSelect("drivers", driver.id.toString())}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.drivers.includes(driver.id.toString()) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {driver.first_name} {driver.last_name} ({driver.username})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
              {filters.drivers.map((driverId) => {
                const driver = drivers.find((d) => d.id.toString() === driverId)
                return driver ? (
                  <Badge key={driverId} variant="secondary" className="text-xs">
                    {driver.first_name} {driver.last_name}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter("drivers", driverId)} />
                  </Badge>
                ) : null
              })}
            </div>
          </div>

          {/* Vehicles Filter */}
          <div className="space-y-2">
            <Label>Vehicles</Label>
            <Popover open={openVehicles} onOpenChange={setOpenVehicles}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openVehicles}
                  className="w-full justify-between"
                >
                  {filters.vehicles.length > 0 ? `${filters.vehicles.length} selected` : "Select vehicles..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search vehicles..." />
                  <CommandList>
                    <CommandEmpty>No vehicles found.</CommandEmpty>
                    <CommandGroup>
                      {vehicles.map((vehicle) => (
                        <CommandItem
                          key={vehicle.id}
                          onSelect={() => toggleMultiSelect("vehicles", vehicle.id.toString())}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.vehicles.includes(vehicle.id.toString()) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {vehicle.license_plate} - {vehicle.model}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
              {filters.vehicles.map((vehicleId) => {
                const vehicle = vehicles.find((v) => v.id.toString() === vehicleId)
                return vehicle ? (
                  <Badge key={vehicleId} variant="secondary" className="text-xs">
                    {vehicle.license_plate}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter("vehicles", vehicleId)} />
                  </Badge>
                ) : null
              })}
            </div>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Popover open={openStatus} onOpenChange={setOpenStatus}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openStatus} className="w-full justify-between">
                  {filters.status.length > 0 ? `${filters.status.length} selected` : "Select status..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandGroup>
                      {statusOptions.map((status) => (
                        <CommandItem key={status.value} onSelect={() => toggleMultiSelect("status", status.value)}>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.status.includes(status.value) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {status.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-1">
              {filters.status.map((status) => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {statusOptions.find((s) => s.value === status)?.label}
                  <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter("status", status)} />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
