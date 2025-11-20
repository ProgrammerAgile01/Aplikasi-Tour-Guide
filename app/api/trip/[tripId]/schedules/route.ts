import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

type SessionPayload = {
  user?: { id: string; role: string };
  trips?: Array<{
    id: string;
    name?: string;
    roleOnTrip?: string;
    participantId?: string | null;
  }>;
};

function toNumberOrNull(v: any) {
  if (v === null || v === undefined) return null;
  const n = Number(v?.toString?.() ?? v);
  return Number.isFinite(n) ? n : null;
}

function toHintsArray(v: unknown): string[] | null {
  if (v == null) return null;

  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : (x as any)?.toString?.() ?? ""))
      .filter(Boolean);
  }

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) =>
            typeof x === "string" ? x : (x as any)?.toString?.() ?? ""
          )
          .filter(Boolean);
      }
    } catch {
      // ignore
    }
  }

  if (typeof v === "object") {
    const anyObj = v as any;
    if (Array.isArray(anyObj)) {
      return anyObj
        .map((x: any) => (typeof x === "string" ? x : x?.toString?.() ?? ""))
        .filter(Boolean);
    }
  }

  return null;
}

// helper: build window start/end dari dateText + timeText
function buildSessionWindow(dateText: string, timeText: string) {
  const normalized =
    dateText?.replace?.(/(\d{1,2}) (\w+) (\d{4})/, "$1 $2 $3") || dateText;

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return { start: null as Date | null, end: null as Date | null };
  }

  const base = new Date(parsed);
  const [hStr, mStr] = (timeText ?? "").split(":");
  const h = Number(hStr ?? "0");
  const m = Number(mStr ?? "0");

  base.setHours(h, m, 0, 0);

  const start = new Date(base);
  const end = new Date(start.getTime() + 1 * 60 * 60 * 1000);

  return { start, end };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    // ==== ambil participantId dari token (kalau ada) ====
    let participantId: string | null = null;
    try {
      const payload = (await getSessionFromRequest(
        req
      )) as SessionPayload | null;
      const trips = payload?.trips ?? [];
      const meta = trips.find((t) => t.id === tripId);
      if (meta?.participantId) {
        participantId = meta.participantId;
      }
    } catch {
      // kalau gagal baca token, jadwal tetap jalan tanpa info attendance
    }

    // ==== ambil jadwal ====
    const rows = await prisma.schedule.findMany({
      where: { tripId, deletedAt: null },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
    });

    // ==== ambil attendance peserta (kalau ada participantId) ====
    let attendedSet: Set<string> | null = null;
    if (participantId) {
      const attendances = await prisma.attendance.findMany({
        where: {
          tripId,
          participantId,
        },
        select: { sessionId: true },
      });
      attendedSet = new Set(attendances.map((a) => a.sessionId));
    }

    type TimeStatus = "PAST" | "ONGOING" | "UPCOMING" | "UNKNOWN";

    type DayPayload = {
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
        startAt?: string;
        endAt?: string;
        attended?: boolean;
        timeStatus: TimeStatus;
      }>;
    };

    const now = new Date();
    const mapByDay: Record<number, DayPayload> = {};

    for (const r of rows) {
      const d = r.day;

      // parse tanggal -> ISO per day
      let iso: string | undefined;
      const parsed = Date.parse(
        r.dateText?.replace?.(/(\d{1,2}) (\w+) (\d{4})/, "$1 $2 $3") ||
          r.dateText
      );
      if (!Number.isNaN(parsed)) iso = new Date(parsed).toISOString();

      if (!mapByDay[d]) {
        mapByDay[d] = {
          day: d,
          date: r.dateText,
          dateValueISO: iso,
          sessions: [],
        };
      }

      // hitung window start/end
      const { start, end } = buildSessionWindow(r.dateText, r.timeText);
      let timeStatus: TimeStatus = "UNKNOWN";

      if (start && end) {
        if (now < start) timeStatus = "UPCOMING";
        else if (now >= start && now <= end) timeStatus = "ONGOING";
        else if (now > end) timeStatus = "PAST";
      }

      const attended = attendedSet != null ? attendedSet.has(r.id) : undefined;

      mapByDay[d].sessions.push({
        id: r.id,
        time: r.timeText,
        title: r.title,
        category: r.category ?? null,
        location: r.location ?? null,
        locationMapUrl: r.locationMapUrl ?? null,
        lat: toNumberOrNull(r.locationLat),
        lon: toNumberOrNull(r.locationLon),
        description: r.description ?? null,
        hints: toHintsArray(r.hints),
        isChanged: r.isChanged ?? false,
        isAdditional: r.isAdditional ?? false,
        startAt: start ? start.toISOString() : undefined,
        endAt: end ? end.toISOString() : undefined,
        attended,
        timeStatus,
      });
    }

    const days = Object.values(mapByDay).sort((a, b) => a.day - b.day);
    return NextResponse.json({ ok: true, data: days });
  } catch (err: any) {
    console.error("GET /api/trip/[tripId]/schedules error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
