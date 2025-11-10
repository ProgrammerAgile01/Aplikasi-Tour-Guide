"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, ImageIcon, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GalleryImage {
  id: string
  src: string
  caption: string
  uploadedBy: string
  uploadedAt: string
  location: string
}

export default function GalleryPage() {
  const { toast } = useToast()
  const [images, setImages] = useState<GalleryImage[]>([
    {
      id: "1",
      src: "/sunset-komodo.jpg",
      caption: "Sunset di Pulau Kalong",
      uploadedBy: "Bapak Ahmad",
      uploadedAt: "2 jam yang lalu",
      location: "Pulau Kalong",
    },
    {
      id: "2",
      src: "/snorkeling-pink-beach.jpg",
      caption: "Snorkeling di Pantai Pink",
      uploadedBy: "Ibu Siti",
      uploadedAt: "5 jam yang lalu",
      location: "Pink Beach",
    },
    {
      id: "3",
      src: "/komodo-island-trekking.jpg",
      caption: "Trekking di Pulau Komodo",
      uploadedBy: "Bapak Rudi",
      uploadedAt: "1 hari yang lalu",
      location: "Pulau Komodo",
    },
  ])

  useEffect(() => {
    const newPhotos = [
      {
        id: "4",
        src: "/padar-island-sunset.jpg",
        caption: "Pemandangan menakjubkan dari Pulau Padar",
        uploadedBy: "Ibu Diana",
        uploadedAt: "Baru saja",
        location: "Pulau Padar",
      },
      {
        id: "5",
        src: "/pink-beach-snorkeling-coral.jpg",
        caption: "Terumbu karang yang indah",
        uploadedBy: "Bapak Andi",
        uploadedAt: "1 menit yang lalu",
        location: "Pink Beach",
      },
    ]

    let photoIndex = 0
    const interval = setInterval(() => {
      if (photoIndex < newPhotos.length) {
        setImages((prev) => [newPhotos[photoIndex], ...prev])
        toast({
          title: "Foto Baru!",
          description: `${newPhotos[photoIndex].uploadedBy} baru saja mengunggah foto dari ${newPhotos[photoIndex].location}`,
        })
        photoIndex++
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [toast])

  const handleUpload = () => {
    setTimeout(() => {
      toast({
        title: "Berhasil!",
        description: "Foto terkirim — menunggu persetujuan.",
      })
    }, 500)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Galeri Perjalanan</h1>
          <p className="text-sm text-muted-foreground mt-1">Koleksi momen indah dari perjalanan Anda</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="p-6 border border-dashed border-primary/30 bg-primary/5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Upload size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Upload Foto Anda</p>
            <p className="text-xs text-muted-foreground mt-1">Bagikan momen indah dari perjalanan Anda</p>
          </div>
          <Button onClick={handleUpload} className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            Pilih Foto
          </Button>
        </div>
      </Card>

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Foto Terbaru</h2>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Feed</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div key={image.id} className="space-y-2 animate-in fade-in duration-500">
                <Card className="overflow-hidden aspect-square border border-border">
                  <img
                    src={image.src || "/placeholder.svg"}
                    alt={image.caption}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </Card>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground truncate">{image.caption}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{image.uploadedBy}</span>
                    <span>•</span>
                    <span>{image.location}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {image.uploadedAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 border border-border text-center">
          <ImageIcon size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Belum ada foto di galeri.</p>
        </Card>
      )}
    </div>
  )
}
