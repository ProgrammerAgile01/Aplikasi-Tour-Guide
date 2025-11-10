"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Award, Lock, CheckCircle, MapPin, Camera, Ship, Mountain } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
  location: string
  condition: string
}

export default function BadgesPage() {
  const router = useRouter()
  const [badges, setBadges] = useState<Badge[]>([
    {
      id: "badge-1",
      name: "Penjelajah Labuan Bajo",
      description: "Check-in pertama kali di Pelabuhan Labuan Bajo",
      icon: "ship",
      unlocked: true,
      unlockedAt: "27 Nov 2025, 14:05",
      location: "Pelabuhan Labuan Bajo",
      condition: "Check-in di lokasi",
    },
    {
      id: "badge-2",
      name: "Petualang Pulau Kelor",
      description: "Menyelesaikan trekking di Pulau Kelor",
      icon: "mountain",
      unlocked: true,
      unlockedAt: "27 Nov 2025, 16:30",
      location: "Pulau Kelor",
      condition: "Check-in di lokasi",
    },
    {
      id: "badge-3",
      name: "Fotografer Pulau Padar",
      description: "Upload minimal 3 foto di Pulau Padar",
      icon: "camera",
      unlocked: false,
      location: "Pulau Padar",
      condition: "Upload 3 foto",
    },
    {
      id: "badge-4",
      name: "Raja Pulau Komodo",
      description: "Check-in dan bertemu Komodo di habitat aslinya",
      icon: "award",
      unlocked: false,
      location: "Pulau Komodo",
      condition: "Check-in di lokasi",
    },
    {
      id: "badge-5",
      name: "Penyelam Pink Beach",
      description: "Check-in dan snorkeling di Pink Beach",
      icon: "map-pin",
      unlocked: false,
      location: "Pink Beach",
      condition: "Check-in di lokasi",
    },
    {
      id: "badge-6",
      name: "Master Komodo Trip",
      description: "Selesaikan semua agenda dalam 3 hari",
      icon: "check",
      unlocked: false,
      location: "Semua Lokasi",
      condition: "Selesaikan semua agenda",
    },
  ])

  const [stats, setStats] = useState({
    total: 6,
    unlocked: 2,
    progress: 33,
  })

  useEffect(() => {
    // Load badges dari localStorage
    const storedBadges = localStorage.getItem("user_badges")
    if (storedBadges) {
      const parsedBadges = JSON.parse(storedBadges)
      setBadges(parsedBadges)

      const unlockedCount = parsedBadges.filter((b: Badge) => b.unlocked).length
      setStats({
        total: parsedBadges.length,
        unlocked: unlockedCount,
        progress: Math.round((unlockedCount / parsedBadges.length) * 100),
      })
    } else {
      // Simpan initial badges
      localStorage.setItem("user_badges", JSON.stringify(badges))
    }
  }, [])

  const getIcon = (iconName: string, size = 32) => {
    const className = "text-current"
    switch (iconName) {
      case "ship":
        return <Ship size={size} className={className} />
      case "mountain":
        return <Mountain size={size} className={className} />
      case "camera":
        return <Camera size={size} className={className} />
      case "award":
        return <Award size={size} className={className} />
      case "map-pin":
        return <MapPin size={size} className={className} />
      case "check":
        return <CheckCircle size={size} className={className} />
      default:
        return <Award size={size} className={className} />
    }
  }

  const unlockedBadges = badges.filter((b) => b.unlocked)
  const lockedBadges = badges.filter((b) => !b.unlocked)

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achievement Badges</h1>
        <p className="text-sm text-muted-foreground mt-1">Koleksi pencapaian Anda selama perjalanan</p>
      </div>

      {/* Progress Summary */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/20 rounded-2xl">
            <Award size={32} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Progress Pencapaian</p>
            <p className="text-3xl font-bold text-foreground">
              {stats.unlocked}/{stats.total}
            </p>
            <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{stats.progress}%</p>
            <p className="text-xs text-muted-foreground">Selesai</p>
          </div>
        </div>
      </Card>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Badge Terbuka ({unlockedBadges.length})</h2>
          <div className="grid gap-3">
            {unlockedBadges.map((badge) => (
              <Card key={badge.id} className="p-4 border-2 border-green-200 bg-green-50/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500 rounded-xl text-white flex-shrink-0">{getIcon(badge.icon, 28)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground">{badge.name}</h3>
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {badge.location}
                      </span>
                      {badge.unlockedAt && <span>Diraih: {badge.unlockedAt}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Badge Terkunci ({lockedBadges.length})</h2>
          <div className="grid gap-3">
            {lockedBadges.map((badge) => (
              <Card key={badge.id} className="p-4 border border-border opacity-60">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-xl text-muted-foreground flex-shrink-0 relative">
                    {getIcon(badge.icon, 28)}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                      <Lock size={20} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {badge.location}
                      </span>
                      <span className="text-primary font-medium">Syarat: {badge.condition}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <div className="text-center space-y-3">
          <p className="font-semibold text-foreground">Raih Semua Badge!</p>
          <p className="text-sm text-muted-foreground">
            Selesaikan semua agenda dan dapatkan badge eksklusif Master Komodo Trip
          </p>
          <Button onClick={() => router.push(`/trip/komodo-2025/schedule`)} className="mt-2">
            Lihat Jadwal
          </Button>
        </div>
      </Card>
    </div>
  )
}
