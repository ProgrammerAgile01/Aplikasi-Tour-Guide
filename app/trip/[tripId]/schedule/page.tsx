"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertCircle, Plus } from "lucide-react";

/* ============ Types ============ */
type SessionItem = {
  id: string;
  time: string;
  title: string;
  location?: string | null;
  locationMapUrl?: string | null;
  lat?: number | null;
  lon?: number | null;
  isChanged?: boolean;
  isAdditional?: boolean;
};
type DaySchedule = {
  day: number;
  date: string;
  dateValueISO?: string;
  sessions: SessionItem[];
};
type Trip = { id: string; name: string; status?: string };

/* ============ Utils ============ */
function mapUrlFromLatLon(lat?: number | null, lon?: number | null) {
  if (lat == null || lon == null) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json;
}

// --- VALIDATORS (shape guards) ---
function pickTripShape(raw: any): Trip | null {
  const obj =
    (raw &&
      typeof raw === "object" &&
      raw.data &&
      typeof raw.data === "object" &&
      raw.data) ||
    (raw &&
      typeof raw === "object" &&
      raw.trip &&
      typeof raw.trip === "object" &&
      raw.trip) ||
    (raw && typeof raw === "object" && raw);

  if (obj && typeof obj.id === "string" && obj.id.length > 0) {
    return {
      id: obj.id,
      name:
        typeof obj.name === "string" && obj.name.length > 0
          ? obj.name
          : obj.title ?? obj.id,
      status: obj.status,
    };
  }
  return null;
}

function pickDaysShape(raw: any): DaySchedule[] {
  const arr = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];
  return arr as DaySchedule[];
}

// --- Fetch with fallbacks but with validation ---
async function getTripFromAny(tripId: string): Promise<Trip | null> {
  const id = encodeURIComponent(tripId);
  const tries = [
    `/api/trips/${id}`,
    `/api/trips?id=${id}`,
    `/api/trip?id=${id}`,
  ];
  for (const u of tries) {
    try {
      const j = await fetchJson(u);
      const t = pickTripShape(j);
      if (t) return t;
    } catch {
      // try next
    }
  }
  return null; // biarin null, header tetap aman
}

async function getSchedulesFromAny(tripId: string): Promise<DaySchedule[]> {
  const id = encodeURIComponent(tripId);
  const tries = [
    `/api/trip/${id}/schedules`, // versi dinamis (plural)
    `/api/trip/schedules?tripId=${id}`, // versi query (plural)
    `/api/trip/${id}/schedules`, // versi dinamis (singular)
    `/api/trip/schedules?tripId=${id}`, // versi query (singular)
    `/api/schedules?tripId=${id}`, // generic
  ];
  for (const u of tries) {
    try {
      const j = await fetchJson(u);
      const d = pickDaysShape(j);
      if (d.length) return d;
    } catch {
      // try next
    }
  }
  return []; // tidak error, hanya kosong
}

/* ============ Page ============ */
export default function SchedulePage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  if (!tripId) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">Memuat trip…</p>
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [t, d] = await Promise.all([
          getTripFromAny(tripId),
          getSchedulesFromAny(tripId),
        ]);

        if (!cancelled) {
          if (t && t.id) setTrip(t); // ✅ hanya set jika valid
          setDays(d);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Terjadi kesalahan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // auto-pilih "hari ini"
  useEffect(() => {
    if (!days.length) return;
    const today = new Date();
    const idx = days.findIndex((d) => {
      if (!d.dateValueISO) return false;
      const dt = new Date(d.dateValueISO);
      return (
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth() === today.getMonth() &&
        dt.getDate() === today.getDate()
      );
    });
    setSelectedDay(idx >= 0 ? days[idx].day : days[0]?.day ?? 1);
  }, [days]);

  const currentDaySchedule = useMemo(
    () => days.find((d) => d.day === selectedDay),
    [days, selectedDay]
  );

  const handleSessionClick = (sessionId: string) => {
    router.push(
      `/trip/${encodeURIComponent(tripId)}/session/${encodeURIComponent(
        sessionId
      )}`
    );
  };

  // ===== UI states =====
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">Memuat jadwal…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-red-600">Gagal memuat: {err}</p>
      </div>
    );
  }

  // ===== Header labels yang AMAN =====
  const tripNameLabel = trip?.name || "Trip";
  const tripCodeLabel = String(tripId); // selalu ada karena dari URL

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Jadwal Perjalanan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tripNameLabel} • ({tripCodeLabel})
        </p>
      </div>

      {/* Day pills */}
      {days.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`
                flex-shrink-0 px-4 py-3 rounded-lg border transition-all
                ${
                  selectedDay === day.day
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/50"
                }
              `}
            >
              <p
                className={`text-xs font-medium ${
                  selectedDay === day.day
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Hari {day.day}
              </p>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  selectedDay === day.day
                    ? "text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {day.date}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Belum ada data jadwal.
        </div>
      )}

      {/* Schedule for selected day */}
      {currentDaySchedule && (
        <div className="space-y-4">
          {/* Day Header */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20">
                <span className="font-bold text-primary text-sm">
                  H{currentDaySchedule.day}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {currentDaySchedule.day === 1
                    ? "Kedatangan & Penjemputan"
                    : currentDaySchedule.day === 2
                    ? "Eksplorasi Komodo"
                    : "Kepulangan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentDaySchedule.date}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 pl-6 relative">
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-primary/20"></div>

            {currentDaySchedule.sessions.map((session) => {
              const fallbackMap =
                !session.locationMapUrl &&
                session.lat != null &&
                session.lon != null
                  ? mapUrlFromLatLon(session.lat, session.lon)
                  : null;
              const mapHref = session.locationMapUrl || fallbackMap || null;

              return (
                <div key={session.id} className="relative">
                  <div className="absolute -left-6 top-2 w-5 h-5 bg-card border-2 border-primary rounded-full z-10"></div>

                  <Card
                    onClick={() => handleSessionClick(session.id)}
                    className={`
                      p-4 cursor-pointer hover:shadow-md transition-shadow
                      ${
                        session.isChanged || session.isAdditional
                          ? "border-red-300 border-2"
                          : "border border-border"
                      }
                    `}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock
                            size={16}
                            className="text-primary flex-shrink-0"
                          />
                          <span
                            className={`font-semibold ${
                              session.isChanged || session.isAdditional
                                ? "text-red-600"
                                : "text-foreground"
                            }`}
                          >
                            {session.time}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {session.isChanged && (
                            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                              <AlertCircle size={12} /> Perubahan
                            </span>
                          )}
                          {session.isAdditional && (
                            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                              <Plus size={12} /> Tambahan
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p
                          className={`font-medium leading-relaxed ${
                            session.isChanged || session.isAdditional
                              ? "text-red-600 font-semibold"
                              : "text-foreground"
                          }`}
                        >
                          {session.title}
                        </p>

                        {session.location && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <MapPin size={14} />
                            <span className="truncate">{session.location}</span>
                          </div>
                        )}

                        {mapHref && (
                          <div className="mt-1">
                            <a
                              href={mapHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Buka peta
                            </a>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSessionClick(session.id);
                        }}
                        variant="outline"
                        className="w-full text-sm"
                      >
                        Lihat Detail
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
