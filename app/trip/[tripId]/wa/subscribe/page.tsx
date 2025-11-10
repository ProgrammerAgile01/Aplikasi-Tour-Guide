"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageCircle, ArrowLeft, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function WhatsAppSubscribePage({
  params,
}: {
  params: { tripId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [phoneNumber, setPhoneNumber] = useState("+62")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    // Ensure it starts with +62
    if (!value.startsWith("+62")) {
      value = "+62"
    }
    // Remove non-digit characters except +
    value = value.replace(/[^\d+]/g, "")
    setPhoneNumber(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (phoneNumber.length < 11) {
      toast({
        title: "Nomor Tidak Valid",
        description: "Silakan masukkan nomor WhatsApp yang benar dengan format +62...",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubscribed(true)
      toast({
        title: "Berhasil!",
        description: "Notifikasi WhatsApp aktif. Terima kasih!",
      })
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/trip/${params.tripId}/overview`)
      }, 2000)
    }, 1500)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 min-h-screen flex flex-col">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Kembali</span>
      </button>

      {/* Content */}
      {!isSubscribed ? (
        <>
          {/* Header */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hubungkan WhatsApp</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Aktifkan notifikasi WhatsApp untuk mendapatkan pengingat real-time untuk setiap agenda, perubahan
                jadwal, dan pengumuman penting dari perjalanan Anda.
              </p>
            </div>
          </div>

          {/* Benefits */}
          <Card className="p-4 border border-border space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Keuntungan Notifikasi WhatsApp</h2>
            <ul className="space-y-2">
              {[
                "Pengingat agenda 30 menit sebelumnya",
                "Notifikasi perubahan jadwal secara real-time",
                "Pengumuman penting dari tim guide",
                "Konfirmasi check-in",
                "Update cuaca dan kondisi lokasi",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground">
                Nomor WhatsApp Anda
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+62812345678"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Format: +62 diikuti nomor Anda tanpa angka 0 di awal (contoh: +62812345678)
              </p>
            </div>

            {/* Information */}
            <Card className="p-4 border border-border bg-blue-50/50">
              <p className="text-xs text-foreground">
                Kami akan mengirimkan notifikasi WhatsApp ke nomor ini. Pastikan WhatsApp sudah aktif dan koneksi
                internet stabil untuk menerima pesan.
              </p>
            </Card>

            {/* Submit Button */}
            <div className="space-y-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-semibold"
              >
                {isSubmitting ? "Sedang diproses..." : "Aktifkan Pengingat WhatsApp"}
              </Button>
            </div>
          </form>

          {/* Footer Note */}
          <p className="text-xs text-center text-muted-foreground">
            Privasi Anda terjaga. Kami hanya menggunakan nomor ini untuk notifikasi perjalanan Anda.
          </p>
        </>
      ) : (
        /* Success State */
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <Check size={48} className="text-green-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Berhasil Terhubung!</h2>
            <p className="text-sm text-muted-foreground">
              WhatsApp Anda sudah terhubung. Anda akan menerima notifikasi untuk setiap agenda penting.
            </p>
          </div>

          <p className="text-xs text-muted-foreground italic">Dialihkan ke halaman utama...</p>
        </div>
      )}
    </div>
  )
}
