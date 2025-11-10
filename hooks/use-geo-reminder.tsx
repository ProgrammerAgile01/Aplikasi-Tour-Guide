"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "@/hooks/use-toast"

interface Location {
  lat: string
  lng: string
}

interface Agenda {
  id: string
  title: string
  time: string
  location: Location
}

export function useGeoReminder(nextAgenda: Agenda | null, enabled = true) {
  const [hasNotified, setHasNotified] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula untuk menghitung jarak dalam meter
    const R = 6371e3 // radius bumi dalam meter
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // jarak dalam meter
  }, [])

  const checkProximity = useCallback(
    (position: GeolocationPosition) => {
      if (!nextAgenda || !enabled) return

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude
      const agendaLat = Number.parseFloat(nextAgenda.location.lat)
      const agendaLng = Number.parseFloat(nextAgenda.location.lng)

      setUserPosition({ lat: userLat, lng: userLng })

      const distance = calculateDistance(userLat, userLng, agendaLat, agendaLng)

      // Jika dalam radius 200m dan belum pernah notif untuk agenda ini
      if (distance <= 200 && hasNotified !== nextAgenda.id) {
        setHasNotified(nextAgenda.id)

        // Simpan ke localStorage agar tidak notif lagi
        localStorage.setItem(`notified_${nextAgenda.id}`, "true")

        // Tampilkan notifikasi
        toast({
          title: "📍 Anda Sudah Dekat!",
          description: `${nextAgenda.title} sekitar ${Math.round(distance)}m dari lokasi Anda. Jangan lupa check-in!`,
          duration: 8000,
        })

        // Browser notification jika diizinkan
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Agenda Terdekat", {
            body: `${nextAgenda.title} - ${Math.round(distance)}m dari Anda`,
            icon: "/icon-192x192.png",
          })
        }
      }
    },
    [nextAgenda, enabled, hasNotified, calculateDistance],
  )

  useEffect(() => {
    if (!enabled || !nextAgenda) return

    // Cek apakah sudah pernah notif sebelumnya
    const alreadyNotified = localStorage.getItem(`notified_${nextAgenda.id}`)
    if (alreadyNotified) {
      setHasNotified(nextAgenda.id)
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    // Setup geolocation tracking
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        checkProximity,
        (error) => {
          console.log("[v0] Geolocation error:", error.message)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        },
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [nextAgenda, enabled, checkProximity])

  return { userPosition, hasNotified }
}
