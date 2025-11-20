"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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

// import Dialog untuk preview
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  src: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string; // ISO string
  location: string;
  status?: "PENDING" | "APPROVED";
  isMine?: boolean;
}

interface SessionOption {
  id: string;
  title: string;
  day?: number;
  timeText?: string;
  location?: string | null;
}

// Response ringkas dari API attendance summary
interface MyAttendanceSummary {
  lastSessionId: string | null;
  attendedSessionIds: string[];
}

export default function GalleryPage() {
  const { toast } = useToast();
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // sessions untuk dropdown
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // attendance summary dari server
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [attendedSessionIds, setAttendedSessionIds] = useState<string[]>([]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // state preview untuk foto yang sudah di-approve (live feed)
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);

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

  const attendedSet = useMemo(
    () => new Set(attendedSessionIds),
    [attendedSessionIds]
  );

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

  // Fetch ringkasan attendance saya (lastSession + list sesi yang sudah dihadiri)
  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const fetchAttendanceSummary = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/my-attendance-summary`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled) return;

        if (!data.ok) return;

        const summary = data.data as MyAttendanceSummary;
        setLastSessionId(summary.lastSessionId ?? null);
        setAttendedSessionIds(summary.attendedSessionIds ?? []);
      } catch (err) {
        console.error("Gagal fetch attendance summary:", err);
      }
    };

    fetchAttendanceSummary();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // Auto-select dropdown ke sesi absen terakhir
  useEffect(() => {
    if (
      !selectedSessionId && // hanya kalau belum ada pilihan
      lastSessionId &&
      sessions.length > 0
    ) {
      const exists = sessions.some((s) => s.id === lastSessionId);
      if (exists) {
        setSelectedSessionId(lastSessionId);
      }
    }
  }, [sessions, lastSessionId, selectedSessionId]);

  // Auto-generate caption dari sesi + ambience phrase (tanpa AI)
  useEffect(() => {
    if (!selectedSessionId || sessions.length === 0) return;

    // kalau user sudah sempat edit caption sendiri, jangan ganggu lagi
    if (noteTouched) return;

    const s = sessions.find((x) => x.id === selectedSessionId);
    if (!s) return;

    // ambience phrase secara random, nuansa wisata & menyenangkan
    const ambienceList = [
      "Menikmati suasana yang indah",
      "Momen penuh keceriaan",
      "Petualangan seru hari ini",
      "Menikmati panorama yang memanjakan mata",
      "Momen wisata yang tak terlupakan",
      "Perjalanan yang penuh cerita",
      "Suasana yang begitu menenangkan",
      "Menikmati hari dengan penuh kebahagiaan",
      "Menikmati momen indah bersama teman perjalanan",
    ];
    const ambience =
      ambienceList[Math.floor(Math.random() * ambienceList.length)];

    const parts: string[] = [];
    if (s.location) parts.push(s.location);

    const context = parts.join(" • ");

    const baseCaption = context
      ? `${ambience} di ${context}`
      : `${ambience} dalam agenda ${s.title}`;

    setNote(baseCaption);
  }, [selectedSessionId, sessions, noteTouched]);

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
      formData.append("sessionId", selectedSessionId);

      const res = await fetch(`/api/trips/${tripId}/gallery`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.message ?? "Gagal upload foto");
      }

      const newImage: GalleryImage | undefined = data.image || data.data;
      if (newImage) {
        // masukkan ke paling atas supaya langsung kelihatan
        setImages((prev) => [newImage, ...prev]);
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
      setNoteTouched(false); // reset supaya upload berikutnya bisa auto-caption lagi
      setPreviewUrl(null);
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
              onValueChange={(value) => {
                setSelectedSessionId(value);
                // kalau ganti sesi, dan caption sebelumnya kosong → kita izinkan auto-caption baru
                if (!note) {
                  setNoteTouched(false);
                }
              }}
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
                {sessions.map((s) => {
                  const label = s.title;
                  const isAttended = attendedSet.has(s.id);
                  const isLast = lastSessionId === s.id;

                  return (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm">{label}</span>
                          {isAttended && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                              {isLast ? "Absen terakhir" : "Sudah hadir"}
                            </span>
                          )}
                        </div>
                        {s.location && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {`Hari ${s.day} • ${s.timeText} • ${s.location}`}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
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

          {/* Preview Foto (saat upload) */}
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
              onChange={(e) => {
                setNote(e.target.value);
                setNoteTouched(true); // user mulai ngetik manual
              }}
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

      {/* Gallery Grid */}
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
                  {/* klik foto → buka modal preview */}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(image)}
                    className="w-full h-full focus:outline-none"
                  >
                    <img
                      src={image.src || "/placeholder.svg"}
                      alt={image.caption}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </button>
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

                  {image.status === "PENDING" && image.isMine && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Dalam peninjauan
                    </p>
                  )}
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

      {/* Dialog Preview Foto Live Feed */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewImage?.caption || "Preview Foto Galeri"}
            </DialogTitle>
            <DialogDescription>
              {previewImage ? (
                <span className="text-xs">
                  Diunggah oleh{" "}
                  <span className="font-medium">{previewImage.uploadedBy}</span>
                  {previewImage.location
                    ? ` • ${previewImage.location}`
                    : ""} • {formatRelativeTime(previewImage.uploadedAt)}
                </span>
              ) : (
                "Klik di luar dialog untuk menutup."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {previewImage && (
              <img
                src={previewImage.src}
                alt={previewImage.caption || "Preview foto"}
                className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-200 bg-slate-50"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
