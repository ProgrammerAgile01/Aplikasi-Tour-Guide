import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";
import {
  checkBadgesAfterCheckin,
  checkBadgesAfterAttendanceSummary,
} from "@/lib/badges";
import { updateTripStatusIfAllCompleted } from "@/lib/trip-progress";

const JWT = process.env.JWT_SECRET || "dev-secret";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["token"];
    const auth = verifyToken(sessionToken);
    if (!auth)
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );

    const body = await req.json().catch(() => ({}));
    const { token } = body as { token?: string };
    if (!token)
      return NextResponse.json(
        { ok: false, message: "token required" },
        { status: 400 }
      );

    // verifikasi token QR
    let qr: any;
    try {
      qr = jwt.verify(token, JWT);
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid/Expired token" },
        { status: 400 }
      );
    }

    const tripId = String(qr.tripId);
    const sessionId = String(qr.sessionId);
    const userId = String(auth.user?.id);

    // user harus anggota trip
    const link = await prisma.userTrip.findFirst({ where: { userId, tripId } });
    if (!link)
      return NextResponse.json(
        { ok: false, message: "Anda bukan peserta trip ini" },
        { status: 403 }
      );

    // temukan participant (disarankan kamu permanen link user <-> participant; di sini match by whatsapp/name)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let participant = await prisma.participant.findFirst({
      where: { tripId, whatsapp: user?.whatsapp ?? "" },
    });
    if (!participant) {
      participant = await prisma.participant.findFirst({
        where: { tripId, name: user?.name ?? "" },
      });
    }
    if (!participant) {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan di trip ini" },
        { status: 404 }
      );
    }

    // Upsert Attendance
    const att = await prisma.attendance.upsert({
      where: {
        participantId_sessionId: { participantId: participant.id, sessionId },
      },
      update: { method: "QR" },
      create: {
        tripId,
        sessionId,
        participantId: participant.id,
        method: "QR",
      },
    });

    // Update ringkas participant
    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        totalCheckIns: { increment: 1 },
        lastCheckIn: `${new Date().toLocaleDateString(
          "id-ID"
        )} - ${new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      },
    });

    // EK BADGE BARU
    const [checkinBadges, completeBadges] = await Promise.all([
      // badge tipe CHECKIN_SESSION untuk sesi ini
      checkBadgesAfterCheckin({
        tripId,
        sessionId,
        participantId: participant.id,
      }),
      // badge tipe COMPLETE_ALL_SESSIONS
      checkBadgesAfterAttendanceSummary({
        tripId,
        participantId: participant.id,
      }),
    ]);

    // gabungkan & hilangkan duplikat berdasarkan id
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
        attendanceId: att.id,
        checkedAt: att.checkedAt,
      },
      // dikirim ke frontend utk toast
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
