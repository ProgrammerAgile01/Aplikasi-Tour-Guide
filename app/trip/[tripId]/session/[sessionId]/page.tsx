"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  ArrowLeft,
  Navigation2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

/* ============================
   Types sinkron dengan model
============================ */
type ScheduleApi = {
  id: string;
  tripId: string;
  day: number;
  dateText: string;
  timeText: string;
  title: string;
  category?: string | null;
  location?: string | null;
  locationMapUrl?: string | null;
  locationLat?: string | number | null;
  locationLon?: string | number | null;
  hints?: string[] | null;
  description?: string | null;
  isChanged?: boolean;
  isAdditional?: boolean;
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v : (v as any)?.toString?.() ?? v;
  const n = Number(s as any);
  return Number.isFinite(n) ? n : null;
}

function buildMapHref(
  item: Pick<ScheduleApi, "locationMapUrl" | "locationLat" | "locationLon">
) {
  const lat = toNum(item.locationLat);
  const lon = toNum(item.locationLon);

  if (lat != null && lon != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }

  // fallback: tetap gunakan URL kalau nggak ada koordinat
  return item.locationMapUrl || null;
}

async function fetchJson(u: string) {
  const res = await fetch(u, {
    cache: "no-store",
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json;
}

async function getScheduleDetail(
  tripId: string,
  sessionId: string
): Promise<ScheduleApi> {
  const sid = encodeURIComponent(sessionId);
  const tid = encodeURIComponent(tripId);

  // 1) Ideal: endpoint by ID
  try {
    const j = await fetchJson(`/api/schedules/${sid}`);
    const data: ScheduleApi | undefined = j?.data ?? j;
    if (data?.id) return data;
  } catch {
    // lanjut fallback
  }

  // 2) Fallback: ambil seluruh schedules trip, lalu cari id
  try {
    const j = await fetchJson(`/api/trip/${tid}/schedules`);
    const days = (j?.data ?? []) as Array<{
      day: number;
      date: string;
      dateValueISO?: string;
      sessions: Array<{
        id: string;
        time: string;
        title: string;
        category?: string | null;
        location?: string | null;
        locationMapUrl?: string | null;
        lat?: number | null;
        lon?: number | null;
        description?: string | null;
        hints?: string[] | null;
        isChanged?: boolean;
        isAdditional?: boolean;
      }>;
    }>;

    for (const d of days) {
      const found = d.sessions.find((s) => s.id === sessionId);
      if (found) {
        return {
          id: found.id,
          tripId,
          day: d.day,
          dateText: d.date,
          timeText: found.time,
          title: found.title,
          category: found.category ?? null,
          location: found.location ?? null,
          locationMapUrl: found.locationMapUrl ?? null,
          locationLat: found.lat ?? null,
          locationLon: found.lon ?? null,
          description: found.description ?? null,
          hints: Array.isArray(found.hints) ? found.hints : null,
          isChanged: !!found.isChanged,
          isAdditional: !!found.isAdditional,
        };
      }
    }
  } catch {
    // lanjut
  }

  throw new Error("Sesi tidak ditemukan.");
}

type CheckInStatus = {
  checkedAt: string; // ISO string dari DB
  method: "GEO" | "QR" | "ADMIN" | string;
};

// format jam lokal Asia/Jakarta
function formatCheckedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function formatMethod(method: string) {
  if (method === "GEO") return "Check-in Lokasi";
  if (method === "QR") return "Scan QR";
  if (method === "ADMIN") return "Konfirmasi Admin";
  return method;
}

const SessionMap = dynamic(() => import("@/components/session-map"), {
  ssr: false,
});

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string; sessionId: string }>();
  const tripId = params!.tripId;
  const sessionId = params!.sessionId;

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ScheduleApi | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(
    null
  );

  // OPTIONAL: baca localStorage supaya UX cepat (akan dioverride DB)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`checkin-${tripId}-${sessionId}`);
      if (saved) {
        const d = JSON.parse(saved);
        if (d?.checkedInAt && d?.method) {
          // kita treat ini sebagai "sementara"
          setCheckInStatus({
            checkedAt: d.checkedInAt,
            method: d.method,
          });
        }
      }
    } catch {
      // ignore
    }
  }, [tripId, sessionId]);

  // Ambil detail sesi
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const detail = await getScheduleDetail(tripId, sessionId);
        if (!cancelled) setData(detail);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Gagal memuat sesi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, sessionId]);

  // 🔥 Ambil status attendance dari DATABASE
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const q = new URLSearchParams({
          tripId,
          sessionId,
        }).toString();

        const j = await fetchJson(`/api/attendance/my?${q}`);
        const data = j?.data as {
          checkedAt: string;
          method: string;
        } | null;

        if (cancelled) return;

        if (!data) {
          // belum pernah absen → pastikan state null
          setCheckInStatus(
            (prev) => (prev && !prev.checkedAt ? null : prev) // kalau mau, bisa langsung null saja
          );
          return;
        }

        setCheckInStatus({
          checkedAt: data.checkedAt,
          method: data.method,
        });
      } catch (e) {
        // kalau error, jangan blok UI, cukup log + optionally toast
        console.error("Gagal ambil attendance dari DB", e);
        // toast({
        //   variant: "destructive",
        //   title: "Gagal cek kehadiran",
        //   description: "Silakan coba refresh halaman.",
        // });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, sessionId]);

  const mapHref = useMemo(() => (data ? buildMapHref(data) : null), [data]);

  const handleViewLocation = () => {
    if (mapHref) window.open(mapHref, "_blank");
  };
  const handleCheckIn = () => {
    router.push(
      `/trip/${encodeURIComponent(tripId)}/session/${encodeURIComponent(
        sessionId
      )}/checkin`
    );
  };
  const handleScanQR = () => {
    router.push(
      `/trip/${encodeURIComponent(tripId)}/session/${encodeURIComponent(
        sessionId
      )}/scan`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm">Memuat sesi</p>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Kembali ke Jadwal</span>
        </button>
        <Card className="p-4 border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            Gagal memuat sesi: {err ?? "Tidak ditemukan"}
          </p>
        </Card>
      </div>
    );
  }

  const title = data.title || "Sesi";
  const time = data.timeText || "-";
  const date = data.dateText || "-";
  const location = data.location || "-";
  const instructions = Array.isArray(data.hints) ? data.hints : [];

  // ambil koordinat numerik
  const latNum = toNum(data.locationLat);
  const lonNum = toNum(data.locationLon);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Kembali ke Jadwal</span>
      </button>

      {/* Session Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock size={16} />
            {time}
          </div>
          <p className="text-xs">{date}</p>
        </div>
      </div>

      {/* Check-in badge (dari DB) */}
      {checkInStatus && (
        <Card className="p-4 border border-green-200 bg-green-50 gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              Sudah Dikonfirmasi
            </p>
            <p className="text-xs text-green-700">
              Kehadiran dikonfirmasi pukul{" "}
              {formatCheckedAt(checkInStatus.checkedAt)} via{" "}
              {formatMethod(checkInStatus.method)}
            </p>
          </div>
        </Card>
      )}

      {/* Location Card */}
      <Card className="p-4 border border-primary/20 bg-primary/5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 w-full">
            <p className="text-xs font-semibold text-primary uppercase">
              Lokasi
            </p>
            <p className="font-semibold text-foreground">{location}</p>
          </div>
          <Navigation2 size={24} className="text-primary flex-shrink-0" />
        </div>

        {/* Map Preview (OpenStreetMap) */}
        {latNum != null && lonNum != null && (
          <Card className="p-0 border border-border">
            <SessionMap lat={latNum} lon={lonNum} title={location} />
          </Card>
        )}

        {(data.locationLat || data.locationLon) && (
          <p className="text-xs text-muted-foreground">
            {toNum(data.locationLat) ?? "-"}, {toNum(data.locationLon) ?? "-"}
          </p>
        )}
      </Card>

      {/* Description & Instructions */}
      {data.description && (
        <Card className="p-4 border border-border">
          <>
            <h2 className="font-semibold text-foreground mb-2">Deskripsi</h2>
            <p className="text-sm text-foreground leading-relaxed">
              {data.description}
            </p>
          </>
        </Card>
      )}

      {instructions.length > 0 && (
        <Card className="p-4 border border-border">
          <>
            <h2 className="font-semibold text-foreground mt-4">Petunjuk</h2>
            <ul className="space-y-2 mt-2">
              {instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full flex-shrink-0 text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground pt-0.5">
                    {instruction}
                  </span>
                </li>
              ))}
            </ul>
          </>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {mapHref && (
          <Button
            onClick={() => window.open(mapHref, "_blank")}
            variant="outline"
            className="w-full gap-2 text-base py-3 bg-transparent"
          >
            <MapPin size={18} /> Buka Lokasi di Maps
          </Button>
        )}
        <Button
          onClick={handleCheckIn}
          disabled={!!checkInStatus}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-base py-3 disabled:opacity-60"
        >
          <Navigation2 size={18} />
          {checkInStatus ? "Sudah Dikonfirmasi" : "Konfirmasi Kehadiran"}
        </Button>
      </div>

      <Card className="p-4 border border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Perlu bantuan? Hubungi tim kami melalui WhatsApp atau tanyakan kepada
          guide yang berada di lokasi.
        </p>
      </Card>
    </div>
  );
}
