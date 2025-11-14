// app/api/reports/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

type SessionPayload = {
  user?: {
    id: string;
    role: string;
    email?: string | null;
    name?: string | null;
  };
};

export async function GET(req: Request) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const tripId = url.searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Parameter tripId wajib diisi" },
        { status: 400 }
      );
    }

    // Pastikan trip ada
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, name: true },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil data utama paralel
    const [totalParticipants, schedules, attendances] = await Promise.all([
      prisma.participant.count({ where: { tripId } }),
      prisma.schedule.findMany({
        where: { tripId },
        select: {
          id: true,
          day: true,
          dateText: true,
          title: true,
        },
      }),
      prisma.attendance.findMany({
        where: { tripId },
        select: {
          id: true,
          sessionId: true,
          participantId: true,
          checkedAt: true,
        },
      }),
    ]);

    const totalSchedules = schedules.length;

    // Map scheduleId -> schedule
    const scheduleMap = new Map<
      string,
      { id: string; day: number; dateText: string; title: string }
    >();
    for (const s of schedules) {
      scheduleMap.set(s.id, s);
    }

    // ---- DAILY ATTENDANCE ----
    // bucket per 'day' -> { dateText, set participantId }
    const dayBuckets = new Map<
      number,
      { dateText: string; participants: Set<string> }
    >();

    // inisialisasi dari schedules (agar hari tanpa kehadiran tetap muncul)
    for (const s of schedules) {
      if (!dayBuckets.has(s.day)) {
        dayBuckets.set(s.day, {
          dateText: s.dateText,
          participants: new Set<string>(),
        });
      }
    }

    // hitung kehadiran per hari + per session
    const sessionCounts = new Map<string, number>();

    for (const a of attendances) {
      const sched = scheduleMap.get(a.sessionId);
      if (!sched) continue;

      // per session
      sessionCounts.set(a.sessionId, (sessionCounts.get(a.sessionId) ?? 0) + 1);

      // per hari (distinct participant)
      const bucket = dayBuckets.get(sched.day);
      if (bucket && a.participantId) {
        bucket.participants.add(a.participantId);
      }
    }

    // dailyAttendance dengan bentuk yang cocok ke UI:
    // { day: "Hari 1", date: "27 Nov", count, total, percentage }
    const dayEntries = Array.from(dayBuckets.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    const dailyAttendance = dayEntries.map(([day, bucket], idx) => {
      const attendedCount = bucket.participants.size;
      const total = totalParticipants || 0;
      const percentage =
        total > 0 ? parseFloat(((attendedCount * 100) / total).toFixed(1)) : 0;

      return {
        day: `Hari ${idx + 1}`, // urut tampilannya
        date: bucket.dateText, // langsung pakai dateText
        count: attendedCount,
        total,
        percentage,
      };
    });

    // rata-rata kehadiran (persentase)
    const avgAttendancePercent =
      dailyAttendance.length > 0
        ? parseFloat(
            (
              dailyAttendance.reduce((sum, d) => sum + d.percentage, 0) /
              dailyAttendance.length
            ).toFixed(1)
          )
        : null;

    // ---- TOP AGENDA ----
    // hitung checkin per schedule
    const agendaRaw = schedules.map((s) => {
      const checkins = sessionCounts.get(s.id) ?? 0;
      return {
        id: s.id,
        title: s.title,
        checkins,
      };
    });

    // filter yang ada kehadirannya, sort desc, ambil 5
    const agendaNonZero = agendaRaw
      .filter((a) => a.checkins > 0)
      .sort((a, b) => b.checkins - a.checkins)
      .slice(0, 5);

    const topAgenda = agendaNonZero.map((a) => ({
      title: a.title,
      checkins: a.checkins,
      percentage:
        totalParticipants > 0
          ? parseFloat(((a.checkins * 100) / totalParticipants).toFixed(1))
          : 0,
    }));

    // ---- PHOTO / GALLERY ----
    // untuk sekarang kosong dulu (akan diisi kemudian)
    const photoStats: any[] = [];
    const totalPhotoUploaded = 0;

    return NextResponse.json(
      {
        ok: true,
        data: {
          tripId,
          tripName: trip.name,
          totalParticipants,
          totalSchedules,
          avgAttendancePercent,
          totalPhotoUploaded,
          dailyAttendance,
          topAgenda,
          photoStats,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
