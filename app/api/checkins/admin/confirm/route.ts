import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";
import {
  checkBadgesAfterAttendanceSummary,
  checkBadgesAfterCheckin,
} from "@/lib/badges";
import { updateTripStatusIfAllCompleted } from "@/lib/trip-progress";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["token"];
    const auth = verifyToken(sessionToken);

    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // hanya ADMIN
    if (auth.user?.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tripId, sessionId, participantId } = body as {
      tripId?: string;
      sessionId?: string;
      participantId?: string;
    };

    if (!tripId || !sessionId || !participantId) {
      return NextResponse.json(
        { ok: false, message: "tripId, sessionId, participantId wajib diisi" },
        { status: 400 }
      );
    }

    // validasi trip & session & participant
    const [trip, session, participant] = await Promise.all([
      prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } }),
      prisma.schedule.findUnique({
        where: { id: sessionId },
        select: { id: true, tripId: true },
      }),
      prisma.participant.findUnique({
        where: { id: participantId },
        select: { id: true, tripId: true, name: true },
      }),
    ]);

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!session || session.tripId !== tripId) {
      return NextResponse.json(
        { ok: false, message: "Sesi tidak valid untuk trip ini" },
        { status: 400 }
      );
    }
    if (!participant || participant.tripId !== tripId) {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan di trip ini" },
        { status: 404 }
      );
    }

    // upsert Attendance method = ADMIN
    const att = await prisma.attendance.upsert({
      where: {
        participantId_sessionId: { participantId, sessionId },
      },
      update: { method: "ADMIN" },
      create: {
        tripId,
        sessionId,
        participantId,
        method: "ADMIN",
      },
    });

    const now = new Date();
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        totalCheckIns: { increment: 1 },
        lastCheckIn: `${now.toLocaleDateString(
          "id-ID"
        )} - ${now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      },
    });

    // cek badge
    const [checkinBadges, completeBadges] = await Promise.all([
      checkBadgesAfterCheckin({ tripId, sessionId, participantId }),
      checkBadgesAfterAttendanceSummary({ tripId, participantId }),
    ]);

    const allBadges = [...checkinBadges, ...completeBadges];
    const seen = new Set<string>();
    const uniqueBadges = allBadges.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    // update status trip (ongoing → completed jika semua peserta sudah hadir di semua sesi)
    await updateTripStatusIfAllCompleted(tripId);

    return NextResponse.json({
      ok: true,
      data: {
        attendanceId: att.id,
        checkedAt: att.checkedAt,
      },
      newBadges: uniqueBadges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
