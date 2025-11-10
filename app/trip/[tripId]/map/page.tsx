"use client"

import { useState } from "react"
import { MapPin, Navigation, Anchor, Compass } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Type untuk lokasi
interface Location {
  id: string
  name: string
  lat: number
  lng: number
  day: number
  time: string
  visited: boolean
  type: "airport" | "island" | "beach" | "port"
  description: string
}

export default function MapJourneyPage() {
  const [activeLocation, setActiveLocation] = useState<Location | null>(null)

  // Data lokasi perjalanan Komodo
  const locations: Location[] = [
    {
      id: "loc-1",
      name: "Bandara Komodo",
      lat: -8.4866,
      lng: 119.8888,
      day: 1,
      time: "13:00",
      visited: true,
      type: "airport",
      description: "Titik awal perjalanan Anda",
    },
    {
      id: "loc-2",
      name: "Pelabuhan Labuan Bajo",
      lat: -8.4968,
      lng: 119.8877,
      day: 1,
      time: "14:00",
      visited: true,
      type: "port",
      description: "Pelabuhan keberangkatan kapal",
    },
    {
      id: "loc-3",
      name: "Pulau Kelor",
      lat: -8.5172,
      lng: 119.8533,
      day: 1,
      time: "15:30",
      visited: false,
      type: "island",
      description: "Pulau cantik untuk snorkeling",
    },
    {
      id: "loc-4",
      name: "Pulau Rinca",
      lat: -8.6654,
      lng: 119.8041,
      day: 1,
      time: "17:00",
      visited: false,
      type: "island",
      description: "Habitat komodo dragon",
    },
    {
      id: "loc-5",
      name: "Pulau Padar",
      lat: -8.6583,
      lng: 119.6275,
      day: 2,
      time: "06:00",
      visited: false,
      type: "island",
      description: "Sunrise terbaik di Komodo",
    },
    {
      id: "loc-6",
      name: "Pink Beach",
      lat: -8.6683,
      lng: 119.6333,
      day: 2,
      time: "09:00",
      visited: false,
      type: "beach",
      description: "Pantai pasir pink yang unik",
    },
    {
      id: "loc-7",
      name: "Pulau Komodo",
      lat: -8.5889,
      lng: 119.4471,
      day: 2,
      time: "11:30",
      visited: false,
      type: "island",
      description: "Pulau utama komodo dragon",
    },
    {
      id: "loc-8",
      name: "Manta Point",
      lat: -8.5333,
      lng: 119.3667,
      day: 2,
      time: "14:00",
      visited: false,
      type: "beach",
      description: "Spot diving dengan manta ray",
    },
    {
      id: "loc-9",
      name: "Taka Makassar",
      lat: -8.4833,
      lng: 119.2833,
      day: 3,
      time: "08:00",
      visited: false,
      type: "beach",
      description: "Sandbar di tengah laut",
    },
    {
      id: "loc-10",
      name: "Kanawa Island",
      lat: -8.5417,
      lng: 119.7167,
      day: 3,
      time: "10:30",
      visited: false,
      type: "island",
      description: "Pulau terakhir perjalanan",
    },
  ]

  const getIconForType = (type: string) => {
    switch (type) {
      case "airport":
        return "✈️"
      case "island":
        return "🏝️"
      case "beach":
        return "🏖️"
      case "port":
        return "⚓"
      default:
        return "📍"
    }
  }

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank")
  }

  const visitedCount = locations.filter((loc) => loc.visited).length

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Peta Perjalanan</h1>
            <p className="text-sm text-blue-100">Rute Sailing Komodo 3 Hari</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Total Lokasi</p>
            <p className="text-2xl font-bold">{locations.length}</p>
          </div>
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Dikunjungi</p>
            <p className="text-2xl font-bold">{visitedCount}</p>
          </div>
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Progress</p>
            <p className="text-2xl font-bold">{Math.round((visitedCount / locations.length) * 100)}%</p>
          </div>
        </div>
      </div>

      {/* Interactive Map using Google Maps Static API */}
      <div className="p-4 space-y-4">
        <Card className="overflow-hidden">
          <div className="relative w-full h-64">
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1019215.7891234567!2d119.2!3d-8.55!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2db4513c2b2e7c23%3A0x5d9b9a3d9a3d9a3d!2sKomodo%20National%20Park!5e0!3m2!1sen!2sid!4v1234567890123!5m2!1sen!2sid`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-muted-foreground">Dikunjungi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-muted-foreground">Belum Dikunjungi</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-muted-foreground">Rute Kapal</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Location List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Anchor className="w-5 h-5 text-primary" />
              Daftar Lokasi Perjalanan
            </h2>
            <Badge variant="secondary">{locations.length} Titik</Badge>
          </div>

          <div className="space-y-2">
            {locations.map((location, index) => (
              <Card
                key={location.id}
                className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                  activeLocation?.id === location.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setActiveLocation(activeLocation?.id === location.id ? null : location)}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getIconForType(location.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-semibold text-foreground">{location.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hari {location.day} • Pukul {location.time}
                        </p>
                        {location.visited && (
                          <Badge variant="default" className="mt-2 bg-green-100 text-green-700 border-green-200">
                            <span className="mr-1">✓</span>
                            Sudah Dikunjungi
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        location.visited ? "bg-green-500" : "bg-blue-600"
                      } text-white shadow`}
                    >
                      <MapPin size={16} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {activeLocation?.id === location.id && (
                    <div className="pt-3 border-t border-border space-y-3 animate-in slide-in-from-top-2">
                      <p className="text-sm text-muted-foreground">{location.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted rounded p-2">
                          <p className="text-muted-foreground">Latitude</p>
                          <p className="font-mono font-semibold">{location.lat.toFixed(4)}</p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-muted-foreground">Longitude</p>
                          <p className="font-mono font-semibold">{location.lng.toFixed(4)}</p>
                        </div>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          openGoogleMaps(location.lat, location.lng)
                        }}
                      >
                        <MapPin size={16} />
                        Buka di Google Maps
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
