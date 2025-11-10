"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export default function ScanQRPage({
  params,
}: {
  params: { tripId: string; sessionId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isScanning, setIsScanning] = useState(true)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scannedAt, setScannedAt] = useState<string | null>(null)

  // Simulate QR code scan after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScanning(false)
      setScanResult("SK-20251127-001")
      setScannedAt(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      )

      const checkinData = {
        sessionId: params.sessionId,
        checkedInAt: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        method: "qr",
        timestamp: new Date().getTime(),
      }
      localStorage.setItem(`checkin-${params.tripId}-${params.sessionId}`, JSON.stringify(checkinData))

      toast({
        title: "Berhasil!",
        description: "Kehadiran Anda telah dikonfirmasi.",
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [toast, params.tripId, params.sessionId])

  const handleBackToDetail = () => {
    router.push(`/trip/${params.tripId}/session/${params.sessionId}`)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 flex flex-col h-screen">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Kembali</span>
      </button>

      {/* Scanning Section */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        {isScanning ? (
          <>
            {/* Camera Placeholder */}
            <div className="w-64 h-64 rounded-2xl border-4 border-primary bg-primary/10 flex items-center justify-center relative overflow-hidden">
              {/* Animated scanning line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg border-2 border-primary mx-auto mb-3 animate-pulse"></div>
                  <p className="text-sm text-muted-foreground">Arahkan kamera ke QR Code</p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">Sedang Memindai...</p>
              <p className="text-xs text-muted-foreground">Tunggu sebentar</p>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>

            <div className="text-center space-y-4">
              <div>
                <p className="text-lg font-semibold text-foreground">Scan Berhasil!</p>
                <p className="text-sm text-muted-foreground mt-1">Kehadiran Anda telah dikonfirmasi</p>
              </div>

              <Card className="p-4 border border-border bg-muted/30 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Kode Kehadiran</p>
                  <p className="font-mono font-semibold text-foreground">{scanResult}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Waktu Check-in</p>
                  <p className="font-semibold text-foreground">{scannedAt}</p>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Action Button */}
      {!isScanning && (
        <Button
          onClick={handleBackToDetail}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3"
        >
          Kembali ke Detail Agenda
        </Button>
      )}
    </div>
  )
}
