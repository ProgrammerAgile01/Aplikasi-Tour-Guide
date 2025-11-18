"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  Users,
  Clock,
  Bell,
  MessageCircle,
  Award,
  BookOpen,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { useGeoReminder } from "@/hooks/use-geo-reminder";
import Link from "next/link";
import { useAuth } from "@/lib/auth-client";
import { isNowWithinWindow } from "@/lib/checkin-window";

type OverviewData = {
  id: string;
  title: string;
  subtitle?: string;
  nextAgenda?: {
    id: string;
    title: string;
    time: string;
    date: string;
    locationName?: string | null;
    locationLat?: number | string | null;
    locationLon?: number | string | null;
    startAt?: string;
    endAt?: string;
  };
  todaysSummary?: {
    sessions: number;
    completed: number;
    participants: number;
    duration: string;
  };
  announcements?: {
    id: string | number;
    title?: string;
    content?: string;
    priority?: "NORMAL" | "IMPORTANT" | string;
    isPinned?: boolean;
  }[];
};

function getNextAgendaEta(startAt?: string) {
  if (!startAt) return null;

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;

  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  // sudah lewat cukup jauh
  if (diffMinutes <= -5) {
    return "Agenda ini sudah lewat";
  }

  // kira-kira sedang berlangsung (±5 menit dari start)
  if (Math.abs(diffMinutes) <= 5) {
    return "Sedang berlangsung sekarang";
  }

  const diffHoursTotal = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;
  const diffDays = Math.floor(diffHoursTotal / 24);
  const remainingHours = diffHoursTotal % 24;

  const parts: string[] = [];

  if (diffDays > 0) {
    parts.push(`${diffDays} hari`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours} jam`);
  }

  // kalau kurang dari 1 hari, baru tampilkan menit
  if (diffDays === 0 && remainingMinutes > 0) {
    parts.push(`${remainingMinutes} menit`);
  }

  if (!parts.length) return null;

  return `Absen dibuka dalam ${parts.join(" ")}`;
}

export default function OverviewPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId as string;

  const { user } = useAuth();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkInStatus, setCheckInStatus] = useState<{
    checkedIn: boolean;
    method?: string;
    timestamp?: string;
  }>({ checkedIn: false });

  // NEW: global geo radius (diambil dari /api/admin/geo-radius)
  const [geoRadius, setGeoRadius] = useState<{
    reminder: number;
    attendance: number;
  } | null>(null);

  // fetch overview data
  useEffect(() => {
    if (!tripId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/trips/${encodeURIComponent(tripId)}/overview`,
          {
            cache: "no-store",
            credentials: "same-origin",
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "Gagal memuat data trip");
        setData(json.data as OverviewData);
      } catch (err: any) {
        toast({
          title: "Gagal memuat",
          description: err?.message || "Terjadi kesalahan saat memuat data",
          variant: "destructive",
        });
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId, toast]);

  // NEW: fetch global radius (reminder + absensi)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/geo-radius", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal memuat pengaturan radius");
        }

        setGeoRadius({
          reminder: json.data.geoReminderRadiusMeters,
          attendance: json.data.geoAttendanceRadiusMeters,
        });
      } catch (err) {
        console.error("[Overview] Gagal memuat pengaturan radius:", err);
        // opsional: kalau mau, bisa tampilkan toast, tapi biasanya cukup silent aja
      }
    })();
  }, []);

  const nextAgenda = data?.nextAgenda;
  const summary = data?.todaysSummary;

  const canCheckInNow = nextAgenda
    ? isNowWithinWindow(nextAgenda.startAt, nextAgenda.endAt)
    : false;

  const nextAgendaEta = nextAgenda
    ? getNextAgendaEta(nextAgenda.startAt)
    : null;

  // pakai geo reminder saat data nextAgenda tersedia,
  // radius diambil dari setting global (fallback 1000m di dalam hook)
  useGeoReminder(nextAgenda ?? null, true, {
    radiusMeters: geoRadius?.reminder,
  });

  // restore check-in status (localStorage) PER USER
  useEffect(() => {
    if (!tripId || !data?.nextAgenda?.id || !user?.id) return;

    const sessionId = data.nextAgenda.id;
    const key = `checkin-${tripId}-${sessionId}-${user.id}`;

    try {
      const storedStatus =
        typeof window !== "undefined" ? localStorage.getItem(key) : null;

      if (storedStatus) {
        const parsed = JSON.parse(storedStatus);
        setCheckInStatus({
          checkedIn: true,
          method: parsed.method,
          timestamp: parsed.checkedInAt,
        });
      } else {
        setCheckInStatus({ checkedIn: false });
      }
    } catch {
      setCheckInStatus({ checkedIn: false });
    }
  }, [tripId, data?.nextAgenda?.id, user?.id]);

  const handleViewLocation = () => {
    const lat = data?.nextAgenda?.locationLat;
    const lng = data?.nextAgenda?.locationLon;
    if (lat == null || lng == null) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
    toast({ description: "Membuka Google Maps..." });
  };

  const handleEnableWhatsApp = () => {
    if (!tripId) return;
    router.push(`/trip/${tripId}/wa/subscribe`);
  };

  const title = data?.title ?? "—";
  const subtitle = data?.subtitle ?? "—";
  const announcements = data?.announcements ?? [];

  const handleGoToCheckin = () => {
    if (!tripId || !nextAgenda) return;

    if (!canCheckInNow) {
      toast({
        title: "Belum waktunya absen",
        description:
          "Absen hanya bisa dilakukan pada jam sesi yang berlangsung.",
        variant: "destructive",
      });
      return;
    }

    router.push(`/trip/${tripId}/session/${nextAgenda.id}/checkin`);
  };

  // === progress agenda trip (dari summary) ===
  const totalAgendas = summary?.sessions ?? 0;
  const completedAgendas = summary?.completed ?? 0;
  const progressPercent =
    totalAgendas > 0
      ? Math.min(100, Math.round((completedAgendas / totalAgendas) * 100))
      : 0;

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Memuat data trip...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header dengan Status */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-green-700">
              Terhubung
            </span>
          </div>
        </div>
      </div>

      {/* Progres Agenda Trip */}
      {summary && (
        <Card className="p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">
              Progres Trip Anda
            </span>
            <span className="text-xs text-muted-foreground">
              {completedAgendas} dari {totalAgendas} agenda selesai
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {totalAgendas > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {progressPercent}% perjalanan kamu sudah terselesaikan 🎉
            </p>
          )}
        </Card>
      )}

      {/* Agenda Berikutnya */}
      {nextAgenda && (
        <Card className="p-4 border border-border">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Agenda Berikutnya
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">
                  {nextAgenda.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pukul {nextAgenda.time} • {nextAgenda.date}
                </p>
                {nextAgendaEta && (
                  <p className="text-xs text-primary mt-1">{nextAgendaEta}</p>
                )}
                {/* Info radius reminder (opsional) */}
                {geoRadius?.reminder && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pengingat jarak aktif kalau kamu sudah &lt;{" "}
                    {geoRadius.reminder} m dari lokasi agenda.
                  </p>
                )}
                {checkInStatus.checkedIn && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-700">
                      Check-in berhasil • {checkInStatus.timestamp}
                    </span>
                  </div>
                )}
              </div>

              {/* Tombol: mobile stack, desktop sejajar */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  onClick={handleViewLocation}
                  variant="outline"
                  className="w-full sm:flex-1 gap-2 text-sm bg-transparent"
                  disabled={!nextAgenda.locationLat || !nextAgenda.locationLon}
                >
                  <MapPin size={16} />
                  Lihat Lokasi
                </Button>

                {checkInStatus.checkedIn ? (
                  <Button
                    disabled
                    className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                  >
                    <CheckCircle size={16} />
                    <span className="whitespace-normal text-xs sm:text-sm">
                      Sudah Check-in
                    </span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleGoToCheckin}
                    disabled={!canCheckInNow}
                    className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    <span className="whitespace-normal text-xs sm:text-sm">
                      {canCheckInNow
                        ? "Konfirmasi Kehadiran"
                        : "Absen belum dibuka"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Ringkasan Hari Ini */}
      {summary && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Ringkasan Hari Ini
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Bell size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Agenda</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.sessions}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Selesai</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.completed}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peserta</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.participants}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Clock size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durasi</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.duration}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Fitur Eksklusif */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Fitur Eksklusif
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-white"
          >
            <Link href={`/trip/${tripId}/badges`}>
              <Award size={24} className="text-primary" />
              <span className="text-xs">Badges</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-white"
          >
            <Link href={`/trip/${tripId}/story`}>
              <BookOpen size={24} className="text-primary" />
              <span className="text-xs">Story</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-white"
          >
            <Link href={`/trip/${tripId}/chat`}>
              <MessageSquare size={24} className="text-primary" />
              <span className="text-xs">AI Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pengumuman Terbaru */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Pengumuman Terbaru
          </h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id} className="p-3 border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground truncate">
                      {a.title ?? "Tanpa judul"}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {a.content}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {String(a.priority).toUpperCase() === "IMPORTANT" && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 border border-red-200 text-xs font-medium text-red-700">
                          <AlertCircle size={12} className="text-red-600" />
                          <span>Penting</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
