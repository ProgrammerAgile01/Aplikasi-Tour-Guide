// app/api/admin/dashboard/trips/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // 1. Ambil semua trip (urut terbaru dulu)
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { startDate: "desc" },
    });

    if (trips.length === 0) {
      return NextResponse.json(
        { ok: true, data: { summary: null, trips: [] } },
        { status: 200 }
      );
    }

    // 2. Untuk mengurangi N+1 query, kita ambil data per tabel sekali saja
    const [participants, schedules, galleries, attendances] = await Promise.all(
      [
        prisma.participant.findMany({
          select: { id: true, tripId: true },
        }),
        prisma.schedule.findMany({
          select: { id: true, tripId: true },
        }),
        prisma.gallery.findMany({
          where: { status: "APPROVED" },
          select: { id: true, tripId: true },
        }),
        prisma.attendance.findMany({
          select: { id: true, tripId: true, participantId: true },
        }),
      ]
    );

    // 3. Helper untuk group by tripId
    const byTrip = <T extends { tripId: string }>(items: T[]) => {
      const map = new Map<string, T[]>();
      for (const item of items) {
        const arr = map.get(item.tripId);
        if (arr) arr.push(item);
        else map.set(item.tripId, [item]);
      }
      return map;
    };

    const participantsByTrip = byTrip(participants);
    const schedulesByTrip = byTrip(schedules);
    const galleriesByTrip = byTrip(galleries);
    const attendancesByTrip = byTrip(attendances);

    // 4. Hitung statistik per trip
    const tripStats = trips.map((trip) => {
      const p = participantsByTrip.get(trip.id) ?? [];
      const s = schedulesByTrip.get(trip.id) ?? [];
      const g = galleriesByTrip.get(trip.id) ?? [];
      const a = attendancesByTrip.get(trip.id) ?? [];

      const totalParticipants = p.length;
      const totalAgenda = s.length;
      const totalPhotos = g.length;

      // distinct participant yang pernah hadir di trip tsb
      const distinctParticipantIds = new Set<string>();
      for (const att of a) {
        distinctParticipantIds.add(att.participantId);
      }
      const attendedCount = distinctParticipantIds.size;

      const attendanceRate =
        totalParticipants === 0
          ? 0
          : parseFloat(((attendedCount / totalParticipants) * 100).toFixed(1));

      return {
        id: trip.id,
        name: trip.name,
        status: trip.status,
        startDate: trip.startDate,
        endDate: trip.endDate,
        stats: {
          totalParticipants,
          totalAgenda,
          totalPhotos,
          attendanceRate,
        },
      };
    });

    // 5. Summary global (semua trip)
    const summary = tripStats.reduce(
      (acc, t) => {
        acc.totalTrips += 1;
        acc.totalParticipants += t.stats.totalParticipants;
        acc.totalAgenda += t.stats.totalAgenda;
        acc.totalPhotos += t.stats.totalPhotos;
        acc._attendanceRateSum += t.stats.attendanceRate;
        return acc;
      },
      {
        totalTrips: 0,
        totalParticipants: 0,
        totalAgenda: 0,
        totalPhotos: 0,
        _attendanceRateSum: 0,
      }
    );

    const overallAttendanceRate =
      summary.totalTrips === 0
        ? 0
        : parseFloat(
            (summary._attendanceRateSum / summary.totalTrips).toFixed(1)
          );

    const response = {
      ok: true,
      data: {
        summary: {
          totalTrips: summary.totalTrips,
          totalParticipants: summary.totalParticipants,
          totalAgenda: summary.totalAgenda,
          totalPhotos: summary.totalPhotos,
          attendanceRate: overallAttendanceRate,
        },
        trips: tripStats,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error get all trips dashboard:", error);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat dashboard semua trip" },
      { status: 500 }
    );
  }
}
