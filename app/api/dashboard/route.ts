// app/api/admin/dashboard/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripIdFromQuery = searchParams.get("tripId") ?? undefined;

    // 1. Cari trip (pakai tripId kalau dikirim, kalau tidak ambil trip ongoing terbaru)
    const trip = tripIdFromQuery
      ? await prisma.trip.findUnique({
          where: { id: tripIdFromQuery },
        })
      : await prisma.trip.findFirst({
          where: { status: "ongoing" },
          orderBy: { startDate: "desc" },
        });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // 2. Hitung statistik dasar
    const [totalParticipants, totalAgenda, totalApprovedPhotos] =
      await Promise.all([
        prisma.participant.count({
          where: { tripId: trip.id },
        }),
        prisma.schedule.count({
          where: { tripId: trip.id },
        }),
        prisma.gallery.count({
          where: { tripId: trip.id, status: "APPROVED" },
        }),
      ]);

    // 3. Ambil semua schedule untuk grouping ke daily attendance
    const schedules = await prisma.schedule.findMany({
      where: { tripId: trip.id },
      select: {
        id: true,
        day: true,
        dateText: true,
      },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
    });

    // Group sessionId per day
    const sessionsByDay = new Map<
      number,
      {
        dateText: string;
        sessionIds: string[];
      }
    >();

    for (const s of schedules) {
      const existing = sessionsByDay.get(s.day);
      if (existing) {
        existing.sessionIds.push(s.id);
      } else {
        sessionsByDay.set(s.day, {
          dateText: s.dateText,
          sessionIds: [s.id],
        });
      }
    }

    // 4. Hitung daily attendance (jumlah peserta unik per hari)
    const dailyAttendance: {
      day: string;
      date: string;
      count: number;
      total: number;
      percentage: number;
    }[] = [];

    for (const [day, { dateText, sessionIds }] of sessionsByDay) {
      if (sessionIds.length === 0) continue;

      // distinct participant per day (min 1 checkin di salah satu session hari itu)
      const attendanceForDay = await prisma.attendance.groupBy({
        by: ["participantId"],
        where: {
          tripId: trip.id,
          sessionId: { in: sessionIds },
        },
        _count: { participantId: true },
      });

      const presentCount = attendanceForDay.length;
      const total = totalParticipants;
      const percentage =
        totalParticipants === 0
          ? 0
          : parseFloat(((presentCount / totalParticipants) * 100).toFixed(1));

      dailyAttendance.push({
        day: `Hari ${day}`,
        date: dateText,
        count: presentCount,
        total: totalParticipants,
        percentage,
      });
    }

    dailyAttendance.sort((a, b) => {
      const ad = Number(a.day.replace("Hari ", ""));
      const bd = Number(b.day.replace("Hari ", ""));
      return ad - bd;
    });

    // 5. Hitung rata-rata attendance rate
    const attendanceRate =
      dailyAttendance.length === 0
        ? 0
        : parseFloat(
            (
              dailyAttendance.reduce((sum, d) => sum + d.percentage, 0) /
              dailyAttendance.length
            ).toFixed(1)
          );

    // 6. Recent Activity: ambil dari Attendance, Gallery, Feedback lalu gabungkan
    const [recentAttendances, recentGalleries, recentFeedbacks] =
      await Promise.all([
        prisma.attendance.findMany({
          where: { tripId: trip.id },
          include: {
            participant: true,
            session: true,
          },
          orderBy: { checkedAt: "desc" },
          take: 5,
        }),
        prisma.gallery.findMany({
          where: { tripId: trip.id },
          include: {
            participant: true,
            session: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.feedback.findMany({
          where: { tripId: trip.id },
          include: {
            participant: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    type ActivityItem = {
      user: string;
      action: string;
      time: string;
      createdAt: Date;
    };

    const activities: ActivityItem[] = [];

    const timeFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Attendance → "Check-in di ..."
    recentAttendances.forEach((a) => {
      activities.push({
        user: a.participant?.name ?? "Peserta",
        action: `Check-in di ${
          a.session?.location ?? a.session?.title ?? "sesi"
        }`,
        time: timeFormatter.format(a.checkedAt),
        createdAt: a.checkedAt,
      });
    });

    // Gallery → "Upload foto di galeri"
    recentGalleries.forEach((g) => {
      activities.push({
        user: g.participant?.name ?? "Peserta",
        action: `Upload foto di galeri (${
          g.session?.location ?? g.session?.title ?? "sesi"
        })`,
        time: timeFormatter.format(g.createdAt),
        createdAt: g.createdAt,
      });
    });

    // Feedback → "Memberikan rating X bintang"
    recentFeedbacks.forEach((f) => {
      activities.push({
        user: f.participant?.name ?? "Peserta",
        action: `Memberikan rating ${f.rating} bintang`,
        time: timeFormatter.format(f.createdAt),
        createdAt: f.createdAt,
      });
    });

    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const recentActivity = activities
      .slice(0, 10)
      .map(({ createdAt, ...rest }) => rest);

    return NextResponse.json({
      ok: true,
      data: {
        trip: {
          id: trip.id,
          name: trip.name,
          status: trip.status,
          startDate: trip.startDate,
          endDate: trip.endDate,
        },
        stats: {
          totalParticipants,
          totalAgenda,
          attendanceRate,
          totalPhotos: totalApprovedPhotos,
        },
        dailyAttendance,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error get admin dashboard:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Gagal memuat data dashboard",
      },
      { status: 500 }
    );
  }
}
