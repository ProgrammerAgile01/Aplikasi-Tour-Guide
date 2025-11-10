"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function FeedbackPage() {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Mohon",
        description: "Silakan berikan rating terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false)
      setRating(0)
      setNotes("")
      toast({
        title: "Berhasil!",
        description: "Terima kasih atas umpan balik Anda.",
      })
    }, 1000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Umpan Balik</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kami menghargai masukan Anda untuk meningkatkan layanan kami
        </p>
      </div>

      {/* Rating Section */}
      <Card className="p-6 border border-border space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">Bagaimana pengalaman Anda?</label>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoverRating || rating) ? "fill-primary text-primary" : "text-muted-foreground"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-center text-muted-foreground mt-3">
              {rating === 5 && "Luar biasa! Kami senang Anda menikmati perjalanan ini."}
              {rating === 4 && "Bagus! Kami akan terus meningkatkan layanan."}
              {rating === 3 && "Terima kasih atas penilaian Anda."}
              {rating === 2 && "Mohon maaf atas kekurangannya. Kami akan memperbaiki."}
              {rating === 1 && "Kami minta maaf. Masukan Anda sangat berharga bagi kami."}
            </p>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-6 border border-border space-y-3">
        <label className="block text-sm font-semibold text-foreground">Catatan Tambahan (Opsional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ceritakan pengalaman Anda lebih detail..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={5}
        />
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-semibold"
      >
        {isSubmitting ? "Sedang mengirim..." : "Kirim Umpan Balik"}
      </Button>
    </div>
  )
}
