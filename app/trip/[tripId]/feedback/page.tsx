"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FeedbackDto = {
  id: string;
  rating: number;
  notes: string | null;
  createdAt: string;
};

export default function FeedbackPage() {
  const { toast } = useToast();

  // Ambil tripId dari dynamic route: /trip/[tripId]/feedback
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [myFeedback, setMyFeedback] = useState<FeedbackDto | null>(null);

  // 🔹 Load feedback yang sudah pernah diisi oleh peserta yang login
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;
    setIsLoadingInitial(true);

    fetch(`/api/trips/${encodeURIComponent(tripId)}/feedback?scope=mine`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;
        if (cancelled) return;

        if (json.data) {
          const fb: FeedbackDto = json.data;
          setMyFeedback(fb);
          setRating(fb.rating);
          setNotes(fb.notes ?? "");
        }
      })
      .catch((err) => {
        console.error("Gagal load feedback saya:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInitial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Mohon",
        description: "Silakan berikan rating terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!tripId) {
      toast({
        title: "Data tidak lengkap",
        description: "ID trip tidak ditemukan dari URL.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating,
            notes: notes.trim() || null,
            // participantId tidak perlu dikirim, backend sudah map dari session
          }),
        }
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.message || `Gagal menyimpan feedback (status ${res.status})`
        );
      }

      // Simpan feedback terbaru ke state (supaya tahu kalau dia sudah pernah isi)
      if (data?.data) {
        setMyFeedback(data.data);
      }

      toast({
        title: "Berhasil!",
        description: myFeedback
          ? "Umpan balik Anda berhasil diperbarui."
          : "Terima kasih atas umpan balik Anda.",
      });
    } catch (error: any) {
      console.error("Error submit feedback:", error);
      toast({
        title: "Gagal mengirim",
        description:
          error?.message || "Terjadi kesalahan saat mengirim umpan balik.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Umpan Balik</h1>
        <p className="text-sm text-muted-foreground">
          Kami menghargai masukan Anda untuk meningkatkan layanan kami
        </p>
        {myFeedback && !isLoadingInitial && (
          <p className="text-xs text-emerald-600 mt-1">
            Anda sudah pernah mengisi feedback. Anda dapat memperbarui kapan
            saja.
          </p>
        )}
      </div>

      {/* Rating Section */}
      <Card className="p-6 border border-border space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Bagaimana pengalaman Anda?
          </label>

          {isLoadingInitial ? (
            <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
              Memuat data umpan balik...
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={`${
                      star <= (hoverRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          )}

          {rating > 0 && (
            <p className="text-sm text-center text-muted-foreground mt-3">
              {rating === 5 &&
                "Luar biasa! Kami senang Anda menikmati perjalanan ini."}
              {rating === 4 && "Bagus! Kami akan terus meningkatkan layanan."}
              {rating === 3 && "Terima kasih atas penilaian Anda."}
              {rating === 2 &&
                "Mohon maaf atas kekurangannya. Kami akan memperbaiki."}
              {rating === 1 &&
                "Kami minta maaf. Masukan Anda sangat berharga bagi kami."}
            </p>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-6 border border-border space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Catatan Tambahan (Opsional)
        </label>
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
        disabled={isSubmitting || rating === 0 || isLoadingInitial}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-semibold"
      >
        {isSubmitting
          ? "Sedang mengirim..."
          : myFeedback
          ? "Perbarui Umpan Balik"
          : "Kirim Umpan Balik"}
      </Button>
    </div>
  );
}
