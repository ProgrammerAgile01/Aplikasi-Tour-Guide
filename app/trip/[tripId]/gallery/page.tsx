"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, ImageIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface GalleryImage {
  id: string;
  src: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string; // ISO string
  location: string;
}

interface SessionOption {
  id: string;
  title: string;
  day?: number;
  timeText?: string;
  location?: string | null;
}

export default function GalleryPage() {
  const { toast } = useToast();
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // sessions untuk dropdown
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatRelativeTime = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), {
        addSuffix: true,
        locale: localeId,
      });
    } catch {
      return "";
    }
  };

  // Fetch sessions dari /api/trips/[id]/sessions
  useEffect(() => {
    if (!tripId) return;

    const fetchSessions = async () => {
      try {
        setSessionsLoading(true);
        const res = await fetch(`/api/trips/${tripId}/sessions`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message ?? "Gagal memuat jadwal");

        // endpoint kamu return: { ok: true, items }
        setSessions(data.items as SessionOption[]);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Gagal memuat jadwal",
          description: err?.message ?? "Terjadi kesalahan saat memuat jadwal.",
          variant: "destructive",
        });
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [tripId, toast]);

  // Fetch gallery approved + polling
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const fetchGallery = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/gallery`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.ok) return;
        if (!cancelled) setImages(data.data);
      } catch (err) {
        console.error("Fetch gallery error:", err);
      }
    };

    setIsLoading(true);
    fetchGallery().finally(() => setIsLoading(false));

    const interval = setInterval(fetchGallery, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tripId]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = fileInputRef.current;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      toast({
        title: "Belum ada foto",
        description: "Silakan pilih foto terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSessionId) {
      toast({
        title: "Jadwal belum dipilih",
        description: "Silakan pilih sesi / jadwal untuk foto ini.",
        variant: "destructive",
      });
      return;
    }

    const file = fileInput.files[0];

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("note", note);
      formData.append("sessionId", selectedSessionId); // 🔴 kirim ke backend

      const res = await fetch(`/api/trips/${tripId}/gallery`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.message ?? "Gagal upload foto");
      }

      toast({
        title: "Berhasil!",
        description: "Foto terkirim — menunggu persetujuan admin.",
      });

      if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
        data.newBadges.forEach((b: any) => {
          toast({
            title: "🎉 Badge Baru!",
            description: `Kamu mendapatkan badge "${b.name}"`,
          });
        });
      }

      fileInput.value = "";
      setNote("");
      setPreviewUrl(null);
      // kalau mau, biarin selectedSessionId tetap (biasanya orang upload beberapa foto ke sesi yang sama)
    } catch (err: any) {
      console.error("Upload gallery error:", err);
      toast({
        title: "Gagal upload",
        description: err?.message ?? "Terjadi kesalahan saat mengunggah foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Galeri Perjalanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Koleksi momen indah dari perjalanan Anda
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="p-6 border border-dashed border-primary/30 bg-primary/5">
        <form onSubmit={handleUpload} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Upload size={24} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Upload Foto Anda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pilih jadwal yang sesuai lalu unggah momen terbaik Anda
              </p>
            </div>
          </div>

          {/* Dropdown session */}
          <div className="mt-2">
            <label className="text-xs font-medium text-foreground mb-1 block">
              Pilih Jadwal / Sesi<span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
              disabled={sessionsLoading || sessions.length === 0}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue
                  placeholder={
                    sessionsLoading
                      ? "Memuat jadwal..."
                      : sessions.length === 0
                      ? "Belum ada jadwal tersedia"
                      : "Pilih jadwal"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.day && s.timeText
                      ? `Day ${s.day} • ${s.timeText} • ${s.title}`
                      : s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
              }
            }}
          />

          {/* Preview Foto */}
          {previewUrl && (
            <div className="w-full mt-3">
              <p className="text-xs text-muted-foreground mb-1">
                Preview Foto:
              </p>

              <div className="relative">
                <img
                  src={previewUrl}
                  className="w-full h-64 object-cover rounded-md border"
                />

                <button
                  type="button"
                  className="absolute top-2 right-2 bg-white/80 text-red-600 text-xs px-2 py-1 rounded shadow hover:bg-white"
                  onClick={() => {
                    setPreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Hapus
                </button>
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="text-xs font-medium text-foreground">
              Caption<span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full mt-0 text-sm rounded-md border border-input bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tambahkan catatan / caption"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full justify-center">
            <Button
              type="button"
              onClick={handleChooseFile}
              variant="outline"
              className="flex-1"
            >
              Pilih Foto
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={
                isUploading || sessions.length === 0 || !previewUrl || !note
              }
            >
              {isUploading ? "Mengunggah..." : "Upload Foto"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Gallery Grid (tetap sama seperti sebelumnya) */}
      {isLoading ? (
        <Card className="p-8 border border-border text-center">
          <p className="text-muted-foreground text-sm">Memuat galeri...</p>
        </Card>
      ) : images.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Foto Terbaru</h2>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live Feed</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="space-y-2 animate-in fade-in duration-500"
              >
                <Card className="overflow-hidden aspect-square border border-border">
                  <img
                    src={image.src || "/placeholder.svg"}
                    alt={image.caption}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </Card>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {image.caption || "Tanpa caption"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{image.uploadedBy}</span>
                    {image.location && (
                      <>
                        <span>•</span>
                        <span>{image.location}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelativeTime(image.uploadedAt)}
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
  );
}
