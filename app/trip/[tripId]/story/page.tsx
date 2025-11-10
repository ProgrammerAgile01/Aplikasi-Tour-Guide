"use client"

import { useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Share2, MapPin, Clock, Camera, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StoryMoment {
  id: string
  day: number
  location: string
  time: string
  checkedInAt: string
  image: string
  caption: string
  coordinates: string
}

export default function StoryPage() {
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)

  const tripSummary = {
    title: "Perjalanan Komodo 3 Hari 2 Malam",
    dates: "27-29 November 2025",
    participant: "Peserta VIP",
    totalLocations: 10,
    totalPhotos: 8,
    badgesEarned: 4,
  }

  const moments: StoryMoment[] = [
    {
      id: "m1",
      day: 1,
      location: "Pelabuhan Labuan Bajo",
      time: "14:05",
      checkedInAt: "27 Nov 2025, 14:05 WIB",
      image: "/labuan-bajo-harbor-sailing-boats.jpg",
      caption: "Memulai petualangan dari pelabuhan yang indah",
      coordinates: "-8.4968, 119.8877",
    },
    {
      id: "m2",
      day: 1,
      location: "Pulau Kelor",
      time: "15:45",
      checkedInAt: "27 Nov 2025, 15:45 WIB",
      image: "/kelor-island-snorkeling-underwater.jpg",
      caption: "Snorkeling di perairan jernih Pulau Kelor",
      coordinates: "-8.5172, 119.8533",
    },
    {
      id: "m3",
      day: 1,
      location: "Pulau Rinca",
      time: "17:20",
      checkedInAt: "27 Nov 2025, 17:20 WIB",
      image: "/rinca-island-komodo-dragon-trekking.jpg",
      caption: "Trekking bertemu Komodo di habitat aslinya",
      coordinates: "-8.6654, 119.8041",
    },
    {
      id: "m4",
      day: 2,
      location: "Pulau Padar",
      time: "06:15",
      checkedInAt: "28 Nov 2025, 06:15 WIB",
      image: "/padar-island-sunrise-viewpoint-panoramic.jpg",
      caption: "Sunrise spektakuler dari puncak Pulau Padar",
      coordinates: "-8.6583, 119.6275",
    },
    {
      id: "m5",
      day: 2,
      location: "Pink Beach",
      time: "09:30",
      checkedInAt: "28 Nov 2025, 09:30 WIB",
      image: "/pink-beach-komodo-coral-reef-snorkeling.jpg",
      caption: "Keindahan pasir pink yang menakjubkan",
      coordinates: "-8.6683, 119.6333",
    },
    {
      id: "m6",
      day: 2,
      location: "Pulau Komodo",
      time: "12:00",
      checkedInAt: "28 Nov 2025, 12:00 WIB",
      image: "/komodo-island-dragon-wildlife-photography.jpg",
      caption: "Momen berharga dengan kadal raksasa Komodo",
      coordinates: "-8.5889, 119.4471",
    },
    {
      id: "m7",
      day: 3,
      location: "Taka Makassar",
      time: "08:45",
      checkedInAt: "29 Nov 2025, 08:45 WIB",
      image: "/taka-makassar-sandbar-crystal-water-aerial.jpg",
      caption: "Pulau pasir dengan air sejernih kristal",
      coordinates: "-8.4833, 119.2833",
    },
    {
      id: "m8",
      day: 3,
      location: "Kanawa Island",
      time: "11:00",
      checkedInAt: "29 Nov 2025, 11:00 WIB",
      image: "/kanawa-island-beach-relaxation-paradise.jpg",
      caption: "Relaksasi di surga tersembunyi Kanawa",
      coordinates: "-8.5417, 119.7167",
    },
  ]

  const handleDownload = () => {
    toast({
      title: "Mengunduh Story",
      description: "Story Anda sedang diproses untuk diunduh sebagai PDF",
    })
    // In real app, would generate PDF here
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: tripSummary.title,
          text: `Cerita perjalanan saya: ${tripSummary.title}`,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      toast({
        title: "Link Disalin",
        description: "Link story telah disalin ke clipboard",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8" ref={contentRef}>
        {/* Header Section */}
        <Card className="overflow-hidden border-2 border-primary/20">
          <div className="bg-gradient-to-r from-primary to-purple-600 p-8 text-white text-center">
            <div className="inline-block p-3 bg-white/20 rounded-2xl mb-4">
              <Camera size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-2">{tripSummary.title}</h1>
            <p className="text-white/90 text-lg">{tripSummary.dates}</p>
            <div className="mt-6 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>{tripSummary.totalLocations} Lokasi</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera size={18} />
                <span>{tripSummary.totalPhotos} Foto</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={18} />
                <span>{tripSummary.badgesEarned} Badge</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 border-t border-border">
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1 gap-2">
                <Download size={18} />
                Unduh PDF
              </Button>
              <Button onClick={handleShare} variant="outline" className="flex-1 gap-2 bg-transparent">
                <Share2 size={18} />
                Bagikan
              </Button>
            </div>
          </div>
        </Card>

        {/* Story Timeline */}
        <div className="space-y-6">
          {moments.map((moment, index) => (
            <Card key={moment.id} className="overflow-hidden border border-border hover:shadow-lg transition-shadow">
              {/* Image */}
              <div className="relative aspect-video bg-muted">
                <img
                  src={moment.image || "/placeholder.svg"}
                  alt={moment.location}
                  className="w-full h-full object-cover"
                />
                {/* Day Badge */}
                <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  Hari {moment.day}
                </div>
                {/* Watermark */}
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  Powered by 7Smarts Indonesia
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{moment.location}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{moment.caption}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock size={14} />
                      <span>{moment.time}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Check-in: {moment.checkedInAt}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={12} />
                    <span>{moment.coordinates}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Summary */}
        <Card className="p-8 text-center bg-gradient-to-br from-white to-blue-50 border-2 border-primary/20">
          <div className="max-w-xl mx-auto space-y-4">
            <Award size={48} className="mx-auto text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Perjalanan Sempurna!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Anda telah menyelesaikan perjalanan luar biasa mengunjungi {tripSummary.totalLocations} lokasi eksotis,
              mengabadikan {tripSummary.totalPhotos} momen berharga, dan meraih {tripSummary.badgesEarned} achievement
              badges.
            </p>
            <div className="pt-4 text-sm text-muted-foreground">
              <p className="font-semibold">Terima kasih telah mempercayai perjalanan Anda bersama kami</p>
              <p className="mt-2 text-xs">Powered by 7Smarts Indonesia</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
