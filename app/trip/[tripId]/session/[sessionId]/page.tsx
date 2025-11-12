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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";

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
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function buildMapHref(
  item: Pick<ScheduleApi, "locationMapUrl" | "locationLat" | "locationLon">
) {
  if (item.locationMapUrl) return item.locationMapUrl;
  const lat = toNum(item.locationLat);
  const lon = toNum(item.locationLon);
  if (lat != null && lon != null) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
  }
  return null;
}

async function fetchJson(u: string) {
  const res = await fetch(u, { cache: "no-store" });
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
    // PENTING: pastikan route mengirim description & hints
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
          description: found.description ?? null, // ✅ ambil dari API
          hints: Array.isArray(found.hints) ? found.hints : null, // ✅ ambil dari API
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

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string; sessionId: string }>();
  const tripId = params!.tripId;
  const sessionId = params!.sessionId;

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ScheduleApi | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<{
    checkedInAt: string;
    method: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`checkin-${tripId}-${sessionId}`);
    if (saved) {
      const d = JSON.parse(saved);
      setCheckInStatus({ checkedInAt: d.checkedInAt, method: d.method });
    }
  }, [tripId, sessionId]);

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
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">Memuat sesi…</p>
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

      {/* Check-in badge */}
      {checkInStatus && (
        <Card className="p-4 border border-green-200 bg-green-50 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              Sudah Dikonfirmasi
            </p>
            <p className="text-xs text-green-700">
              Kehadiran dikonfirmasi pukul {checkInStatus.checkedInAt} via{" "}
              {checkInStatus.method === "geo" ? "Check-in Lokasi" : "Scan QR"}
            </p>
          </div>
        </Card>
      )}

      {/* Location Card */}
      <Card className="p-4 border border-primary/20 bg-primary/5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase">
              Lokasi
            </p>
            <p className="font-semibold text-foreground">{location}</p>
            {(data.locationLat || data.locationLon) && (
              <p className="text-xs text-muted-foreground">
                {toNum(data.locationLat) ?? "-"},{" "}
                {toNum(data.locationLon) ?? "-"}
              </p>
            )}
          </div>
          <Navigation2 size={24} className="text-primary flex-shrink-0" />
        </div>
      </Card>

      {/* Description & Instructions */}
      {(data.description || instructions.length > 0) && (
        <Card className="p-4 border border-border">
          {data.description && (
            <>
              <h2 className="font-semibold text-foreground mb-2">Deskripsi</h2>
              <p className="text-sm text-foreground leading-relaxed">
                {data.description}
              </p>
            </>
          )}
          {instructions.length > 0 && (
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
          )}
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
            <MapPin size={18} /> Buka Lokasi di Peta
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
