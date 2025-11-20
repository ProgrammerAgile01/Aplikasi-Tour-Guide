"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedbackDto = {
  id: string;
  rating: number;
  notes: string | null;
  createdAt: string;
  tripId: string;
  sessionId: string;
  participantId?: string | null;
};

type SessionOption = {
  id: string;
  day: number;
  title: string;
  dateText: string;
  timeText: string;
};

type MineResponse = {
  ok: boolean;
  data: FeedbackDto | null;
  sessions: SessionOption[];
  lastSessionId: string | null;
  currentSessionId: string | null;
};

const getStarColor = (val: number) => {
  if (val <= 2) return "text-red-500 fill-red-500";
  if (val === 3) return "text-yellow-500 fill-yellow-500";
  if (val === 4) return "text-blue-500 fill-blue-500";
  if (val === 5) return "text-green-500 fill-green-500";
  return "text-muted-foreground";
};

export default function FeedbackPage() {
  const { toast } = useToast();
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingSessionChange, setIsLoadingSessionChange] = useState(false);

  const [myFeedback, setMyFeedback] = useState<FeedbackDto | null>(null);

  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const loadMine = async (sessionId?: string) => {
    if (!tripId) return;

    const query = new URLSearchParams({ scope: "mine" });
    if (sessionId) query.set("sessionId", sessionId);

    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/feedback?${query.toString()}`
    );
    const json = (await res.json().catch(() => null)) as MineResponse | null;

    if (!res.ok || !json?.ok) {
      throw new Error(json?.["message"] || "Gagal memuat umpan balik");
    }

    setSessions(json.sessions ?? []);
    setLastSessionId(json.lastSessionId ?? null);
    setSelectedSessionId(json.currentSessionId ?? null);

    if (json.data) {
      setMyFeedback(json.data);
      setRating(json.data.rating);
      setNotes(json.data.notes ?? "");
    } else {
      setMyFeedback(null);
      setRating(0);
      setNotes("");
    }
  };

  // Load awal (tanpa sessionId → otomatis pakai sesi terakhir absen)
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;
    setIsLoadingInitial(true);

    loadMine()
      .catch((err) => {
        if (cancelled) return;
        console.error("Gagal load umpan balik saya:", err);
        toast({
          title: "Gagal memuat",
          description: err?.message || "Tidak bisa memuat data umpan balik",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInitial(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const handleChangeSession = async (sessionId: string) => {
    if (!tripId) return;
    setSelectedSessionId(sessionId);
    setIsLoadingSessionChange(true);

    try {
      await loadMine(sessionId);
    } catch (err: any) {
      console.error("Gagal ganti sesi feedback:", err);
      toast({
        title: "Gagal memuat sesi",
        description:
          err?.message || "Terjadi kesalahan saat memuat data sesi ini",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessionChange(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Mohon",
        description: "Silakan berikan rating terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!tripId) {
      toast({
        title: "Data tidak lengkap",
        description: "ID trip tidak ditemukan dari URL",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSessionId) {
      toast({
        title: "Pilih sesi dulu",
        description: "Silakan pilih jadwal/sesi yang ingin Anda ulas",
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
            sessionId: selectedSessionId,
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
          data?.message || `Gagal menyimpan umpan balik (status ${res.status})`
        );
      }

      if (data?.data) {
        setMyFeedback(data.data);
      }

      toast({
        title: "Berhasil!",
        description: myFeedback
          ? "Umpan balik Anda untuk sesi ini berhasil diperbarui"
          : "Terima kasih atas umpan balik Anda untuk sesi ini",
      });
    } catch (error: any) {
      console.error("Error submit feedback:", error);
      toast({
        title: "Gagal mengirim",
        description:
          error?.message || "Terjadi kesalahan saat mengirim umpan balik",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedIsLast =
    selectedSessionId && lastSessionId && selectedSessionId === lastSessionId;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          Umpan Balik (Ulasan)
        </h1>
        <p className="text-sm text-muted-foreground">
          Kami menghargai masukan Anda untuk meningkatkan layanan kami
        </p>
      </div>

      {/* Dropdown Sesi */}
      <Card className="p-4 border border-border space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-col flex-wrap gap-1">
            <span className="text-sm font-semibold text-foreground">
              Pilih Sesi yang Ingin Diulas
            </span>
          </div>

          <div className="min-w-[220px]">
            <Select
              value={selectedSessionId ?? undefined}
              onValueChange={(val) => handleChangeSession(val)}
              disabled={isLoadingInitial || isLoadingSessionChange}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingInitial ? "Memuat sesi..." : "Pilih sesi"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      {`${s.title}`}
                      <span className="text-[10px] text-muted-foreground text-start">{`Hari ${s.day} • ${s.timeText}`}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedIsLast && (
          <div className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            Sesi terakhir Anda hadir 🎯
          </div>
        )}
      </Card>

      {/* Rating Section */}
      <Card className="p-6 border border-border space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Bagaimana pengalaman Anda pada sesi ini?
          </label>

          {isLoadingInitial || isLoadingSessionChange ? (
            <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
              Memuat data umpan balik sesi...
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
                        ? getStarColor(hoverRating || rating)
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
                "Luar biasa! Kami senang Anda menikmati sesi ini"}
              {rating === 4 && "Bagus! Kami akan terus meningkatkan layanan"}
              {rating === 3 && "Terima kasih atas penilaian Anda"}
              {rating === 2 &&
                "Mohon maaf atas kekurangannya. Kami akan memperbaiki"}
              {rating === 1 &&
                "Kami minta maaf. Masukan Anda sangat berharga bagi kami"}
            </p>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-6 border border-border space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Catatan Tambahan
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ceritakan pengalaman Anda lebih detail pada sesi ini..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={5}
        />
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={
          isSubmitting || rating === 0 || isLoadingInitial || !selectedSessionId
        }
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-semibold"
      >
        {isSubmitting
          ? "Sedang mengirim..."
          : myFeedback
          ? "Perbarui Ulasan"
          : "Kirim Ulasan"}
      </Button>
    </div>
  );
}
