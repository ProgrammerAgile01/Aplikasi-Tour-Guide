import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * Robust resolver untuk ambil tripId dari params atau URL
 */
async function resolveTripId(
  req: Request,
  params: any
): Promise<string | undefined> {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p?.id ?? p?.["0"] ?? p?.tripId;
    if (idFromParams) return decodeURIComponent(String(idFromParams));
  } catch {
    // ignore
  }

  try {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const i = parts.findIndex((x) => x === "trips");
    const id = i >= 0 ? parts[i + 1] : parts[parts.length - 2];
    return id ? decodeURIComponent(id) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * NB: sekarang trips di token punya participantId
 *  {
 *    id, name, roleOnTrip, participantId
 *  }
 */
type SessionPayload = {
  user?: { id: string; role: string };
  trips?: Array<{
    id: string;
    name?: string;
    roleOnTrip?: string;
    participantId?: string | null;
  }>;
};

// helper Decimal -> number
const toNum = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "object" && typeof v.toNumber === "function") {
    return v.toNumber();
  }
  return Number(v);
};

// helper: bikin window waktu dari schedule (start & end)
function buildSessionWindow(dateText: string, timeText: string) {
  // normalisasi mirip route schedules
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
  const end = new Date(start.getTime());

  return { start, end };
}

/**
 * GET /api/trips/[id]/overview
 */
export async function GET(req: Request, ctx: { params: any }) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;

    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    const tripId = await resolveTripId(req, ctx.params);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Bad Request: tripId missing" },
        { status: 400 }
      );
    }

    // pastikan user memang punya trip ini (kecuali ADMIN)
    const tripMeta = (payload.trips ?? []).find((t) => t.id === tripId);
    if (role !== "ADMIN" && !tripMeta) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const participantId = tripMeta?.participantId ?? null;

    // ambil trip + jadwal + peserta + pengumuman
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { timeText: "asc" }],
        },
        participants: true,
        announcements: {
          orderBy: [
            { priority: "desc" },
            { isPinned: "desc" },
            { createdAt: "desc" },
          ],
          take: 20,
        },
      },
    });

    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // ==== NEXT AGENDA BERDASARKAN ABSENSI PESERTA ====
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

    const schedules = Array.isArray(trip.schedules) ? trip.schedules : [];

    // === hitung window waktu utk semua schedules
    const now = new Date();
    const DUR_MS = 1 * 60 * 60 * 1000; // kalau mau beda durasi, bisa diubah

    const scheduleWindows = schedules.map((s) => {
      const { start, end } = buildSessionWindow(s.dateText, s.timeText);
      const effectiveEnd =
        end ?? (start ? new Date(start.getTime() + DUR_MS) : null);
      return { raw: s, start, end: effectiveEnd };
    });

    // filter: hanya sesi yg BELUM benar-benar lewat (end >= now)
    const futureOrOngoing = scheduleWindows
      .filter((x) => x.start && x.end && x.end.getTime() >= now.getTime())
      .sort((a, b) => a.start!.getTime() - b.start!.getTime());

    let next: (typeof schedules)[number] | undefined;

    if (futureOrOngoing.length === 0) {
      next = undefined;
    } else if (attendedSet) {
      // pilih sesi pertama yg belum di-absen & belum lewat
      const candidate = futureOrOngoing.find(
        (x) => !attendedSet!.has(x.raw.id)
      );
      next = candidate?.raw ?? futureOrOngoing[0].raw;
    } else {
      // tanpa participantId → pakai sesi terdekat yg belum lewat
      next = futureOrOngoing[0].raw;
    }

    const completedCount = attendedSet
      ? schedules.filter((s) => attendedSet!.has(s.id)).length
      : 0;

    // ==== HITUNG DURASI DARI HARI PERTAMA SAMPAI HARI TERAKHIR ====
    let durationText = "—";
    if (schedules.length > 0) {
      const minDay = Math.min(...schedules.map((s) => s.day));
      const maxDay = Math.max(...schedules.map((s) => s.day));
      const totalDays = maxDay - minDay + 1;
      durationText = `${totalDays} Hari`;
    }

    let nextAgendaPayload: any = undefined;
    if (next) {
      const { start, end } = buildSessionWindow(next.dateText, next.timeText);

      nextAgendaPayload = {
        id: next.id,
        title: next.title,
        time: next.timeText,
        date: next.dateText,
        locationName: next.location,
        locationLat: toNum(next.locationLat),
        locationLon: toNum(next.locationLon),
        startAt: start ? start.toISOString() : undefined,
        endAt: end ? end.toISOString() : undefined,
      };
    }

    const data = {
      id: trip.id,
      title: trip.name,
      subtitle: trip.description ?? undefined,
      nextAgenda: nextAgendaPayload,
      todaysSummary: {
        sessions: schedules.length,
        completed: completedCount,
        participants: Array.isArray(trip.participants)
          ? trip.participants.length
          : 0,
        duration: durationText,
      },
      announcements: (trip.announcements ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        isPinned: a.isPinned,
        createdAt: a.createdAt,
      })),
    };

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/trips/[id]/overview error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
