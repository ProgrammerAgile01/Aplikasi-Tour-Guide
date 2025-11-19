import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["token"];

    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = String(auth.user?.id ?? "");
    const userUsername = String(auth.user?.username ?? "");
    const userWhatsapp = String(auth.user?.whatsapp ?? "");

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "User tidak valid" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const sessionId = searchParams.get("sessionId");

    if (!tripId || !sessionId) {
      return NextResponse.json(
        { ok: false, message: "tripId dan sessionId wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Cari UserTrip untuk memastikan user memang terdaftar di trip ini
    const userTrip = await prisma.userTrip.findFirst({
      where: { userId, tripId },
      select: {
        id: true,
        participantId: true,
      },
    });

    if (!userTrip) {
      return NextResponse.json(
        { ok: false, message: "Anda tidak terdaftar pada trip ini" },
        { status: 403 }
      );
    }

    let participantId: string | null = userTrip.participantId ?? null;

    // 2. Kalau participantId belum keisi (data lama),
    //     fallback cari Participant via username/whatsapp
    if (!participantId) {
      const participant = await prisma.participant.findFirst({
        where: {
          tripId,
          OR: [
            userUsername ? { loginUsername: userUsername } : undefined,
            userWhatsapp ? { whatsapp: userWhatsapp } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true },
      });

      if (!participant) {
        // Tidak dianggap error fatal, cuma berarti belum ada participant
        return NextResponse.json({ ok: true, data: null }, { status: 200 });
      }

      participantId = participant.id;

      // Opsional: auto-update UserTrip lama supaya next time langsung pakai participantId
      await prisma.userTrip.update({
        where: { id: userTrip.id },
        data: { participantId },
      });
    }

    // 3. Cari attendance berdasarkan participantId
    const attendance = await prisma.attendance.findFirst({
      where: {
        tripId,
        sessionId,
        participantId: participantId!,
      },
    });

    if (!attendance) {
      return NextResponse.json({ ok: true, data: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: attendance.id,
          tripId: attendance.tripId,
          sessionId: attendance.sessionId,
          participantId: attendance.participantId,
          method: attendance.method, // "GEO" | "QR" | "ADMIN"
          checkedAt: attendance.checkedAt, // ISO string
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/attendance/my error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
