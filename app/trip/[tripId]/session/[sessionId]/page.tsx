"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Clock, ArrowLeft, Navigation2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

// Mock session data - in a real app, this would be fetched dynamically
const sessionDataMap: {
  [key: string]: {
    title: string
    time: string
    date: string
    location: string
    description: string
    coordinates: { lat: string; lng: string }
    instructions: string[]
    checkedIn: boolean
  }
} = {
  "1-1": {
    title: "Penjemputan di Bandara Komodo Airport",
    time: "13.00 - 13.30",
    date: "27 November 2025",
    location: "Komodo Airport",
    description:
      "Tim kami akan menjemput Anda di Bandara Komodo International Airport. Mohon tunggu di arrival hall dengan papan nama Wisata Komodo.",
    coordinates: { lat: "-8.7242", lng: "120.6529" },
    instructions: [
      "Tunggu di arrival hall dengan papan nama kami",
      "Tim penjemput mengenakan seragam berwarna biru",
      "Persiapkan bagasi Anda sebelumnya",
      "Kami akan membimbing Anda ke kendaraan",
    ],
    checkedIn: false,
  },
  "1-2": {
    title: "Menuju ke pelabuhan untuk inap di Pinisi Deluxe",
    time: "14.30 - 16.00",
    date: "27 November 2025",
    location: "Pelabuhan Labuan Bajo",
    description:
      "Perjalanan dari bandara menuju pelabuhan Labuan Bajo dengan kendaraan pribadi yang nyaman dan ber-AC.",
    coordinates: { lat: "-8.5186", lng: "120.3155" },
    instructions: [
      "Durasi perjalanan sekitar 1,5 jam",
      "Nikmati pemandangan alam sekitar",
      "Kami akan memberikan snack dan minuman",
      "Tiba di pelabuhan untuk boarding kapal",
    ],
    checkedIn: false,
  },
  "2-1": {
    title: "Morning call, naik ke Bukit Padar",
    time: "05.30 - 06.30",
    date: "28 November 2025",
    location: "Bukit Padar",
    description: "Mendaki Bukit Padar untuk menikmati sunrise yang menakjubkan di atas bukit tertinggi.",
    coordinates: { lat: "-8.6751", lng: "120.6225" },
    instructions: [
      "Siap-siap sejak pukul 05.00",
      "Gunakan alas kaki yang nyaman",
      "Siapkan botol minum dan sunscreen",
      "Pendakian memakan waktu sekitar 30 menit",
      "Nikmati sunrise dari puncak bukit",
    ],
    checkedIn: false,
  },
}

export default function SessionDetailPage({
  params,
}: {
  params: { tripId: string; sessionId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<{
    checkedInAt: string
    method: string
  } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`checkin-${params.tripId}-${params.sessionId}`)
    if (saved) {
      const data = JSON.parse(saved)
      setCheckInStatus({
        checkedInAt: data.checkedInAt,
        method: data.method,
      })
    }
  }, [params.tripId, params.sessionId])

  const session = sessionDataMap[params.sessionId] || {
    title: "Session",
    time: "12.00",
    date: "27 November 2025",
    location: "Lokasi",
    description: "Deskripsi session",
    coordinates: { lat: "-8.7242", lng: "120.6529" },
    instructions: ["Instruksi 1", "Instruksi 2"],
    checkedIn: false,
  }

  const handleViewLocation = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${session.coordinates.lat},${session.coordinates.lng}`
    window.open(url, "_blank")
  }

  const handleCheckIn = () => {
    router.push(`/trip/${params.tripId}/session/${params.sessionId}/checkin`)
  }

  const handleScanQR = () => {
    router.push(`/trip/${params.tripId}/session/${params.sessionId}/scan`)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Kembali ke Jadwal</span>
      </button>

      {/* Session Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock size={16} />
            {session.time}
          </div>
          <p className="text-xs">{session.date}</p>
        </div>
      </div>

      {checkInStatus && (
        <Card className="p-4 border border-green-200 bg-green-50 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Sudah Dikonfirmasi</p>
            <p className="text-xs text-green-700">
              Kehadiran dikonfirmasi pukul {checkInStatus.checkedInAt} via{" "}
              {checkInStatus.method === "geo" ? "Check-in Lokasi" : "Scan QR"}
            </p>
          </div>
        </Card>
      )}

      {/* Location Card */}
      <Card className="p-4 border border-primary/20 bg-primary/5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase">Lokasi</p>
            <p className="font-semibold text-foreground">{session.location}</p>
            <p className="text-xs text-muted-foreground">
              {session.coordinates.lat}, {session.coordinates.lng}
            </p>
          </div>
          <Navigation2 size={24} className="text-primary flex-shrink-0" />
        </div>
      </Card>

      {/* Description */}
      <Card className="p-4 border border-border">
        <h2 className="font-semibold text-foreground mb-2">Deskripsi</h2>
        <p className="text-sm text-foreground leading-relaxed">{session.description}</p>
      </Card>

      {/* Instructions */}
      <Card className="p-4 border border-border space-y-3">
        <h2 className="font-semibold text-foreground">Petunjuk</h2>
        <ul className="space-y-2">
          {session.instructions.map((instruction, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full flex-shrink-0 text-xs font-semibold">
                {index + 1}
              </span>
              <span className="text-sm text-foreground pt-0.5">{instruction}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button onClick={handleViewLocation} variant="outline" className="w-full gap-2 text-base py-3 bg-transparent">
          <MapPin size={18} />
          Lihat Lokasi di Google Maps
        </Button>

        <Button
          onClick={handleCheckIn}
          disabled={!!checkInStatus}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-base py-3 disabled:opacity-60"
        >
          <Navigation2 size={18} />
          {checkInStatus ? "Sudah Dikonfirmasi" : "Konfirmasi Kehadiran"}
        </Button>
      </div>

      {/* Help Section */}
      <Card className="p-4 border border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Perlu bantuan? Hubungi tim kami melalui WhatsApp atau tanyakan kepada guide yang berada di lokasi.
        </p>
      </Card>
    </div>
  )
}
