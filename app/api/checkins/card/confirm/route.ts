import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";
import {
  checkBadgesAfterCheckin,
  checkBadgesAfterAttendanceSummary,
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

    const role = String(auth.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden (hanya admin)" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tripId, sessionId, token } = body as {
      tripId?: string;
      sessionId?: string;
      token?: string;
    };

    if (!tripId || !sessionId || !token) {
      return NextResponse.json(
        { ok: false, message: "tripId, sessionId & token wajib diisi" },
        { status: 400 }
      );
    }

    // validasi session milik trip & belum dihapus
    const schedule = await prisma.schedule.findUnique({
      where: { id: sessionId },
    });

    if (!schedule || schedule.tripId !== tripId || schedule.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Agenda tidak valid untuk trip ini" },
        { status: 400 }
      );
    }

    // ===== PARSE TOKEN DARI QR KARTU =====
    const raw = token.trim();
    const PREFIX = "TW-CHECKIN:";

    if (!raw.startsWith(PREFIX)) {
      return NextResponse.json(
        { ok: false, message: "Format kode tidak dikenal" },
        { status: 400 }
      );
    }

    const checkinToken = raw.slice(PREFIX.length).trim();
    if (!checkinToken) {
      return NextResponse.json(
        { ok: false, message: "Kode peserta tidak valid" },
        { status: 400 }
      );
    }

    // ===== CARI PESERTA BERDASARKAN TOKEN & TRIP =====
    const participant = await prisma.participant.findFirst({
      where: {
        tripId,
        checkinToken,
        deletedAt: null,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan untuk trip ini" },
        { status: 404 }
      );
    }

    // ===== UPSERT ATTENDANCE (METODE QR) =====
    const attendance = await prisma.attendance.upsert({
      where: {
        participantId_sessionId: {
          participantId: participant.id,
          sessionId,
        },
      },
      update: { method: "QR" },
      create: {
        tripId,
        sessionId,
        participantId: participant.id,
        method: "QR",
      },
    });

    // ===== UPDATE RINGKAS PESERTA =====
    const now = new Date();
    await prisma.participant.update({
      where: { id: participant.id },
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

    // ===== BADGE & STATUS TRIP =====
    const [checkinBadges, completeBadges] = await Promise.all([
      checkBadgesAfterCheckin({
        tripId,
        sessionId,
        participantId: participant.id,
      }),
      checkBadgesAfterAttendanceSummary({
        tripId,
        participantId: participant.id,
      }),
    ]);

    const allBadges = [...checkinBadges, ...completeBadges];
    const seen = new Set<string>();
    const uniqueBadges = allBadges.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    await updateTripStatusIfAllCompleted(tripId);

    return NextResponse.json({
      ok: true,
      data: {
        attendanceId: attendance.id,
        checkedAt: attendance.checkedAt,
        participant: {
          id: participant.id,
          name: participant.name,
        },
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
