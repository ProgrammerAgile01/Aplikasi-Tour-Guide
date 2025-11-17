import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
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

    // optional: hanya ADMIN yang boleh
    if (auth.user?.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const tripId = url.searchParams.get("tripId") || "";
    const sessionId = url.searchParams.get("sessionId") || "";

    if (!tripId || !sessionId) {
      return NextResponse.json(
        { ok: false, message: "tripId & sessionId wajib diisi" },
        { status: 400 }
      );
    }

    // pastikan sesi milik trip tsb
    const session = await prisma.schedule.findUnique({
      where: { id: sessionId },
      select: { tripId: true, title: true },
    });

    if (!session || session.tripId !== tripId) {
      return NextResponse.json(
        { ok: false, message: "Sesi tidak valid untuk trip ini" },
        { status: 400 }
      );
    }

    // semua peserta trip yg BELUM punya attendance untuk sessionId ini
    const participants = await prisma.participant.findMany({
      where: {
        tripId,
        attendances: {
          none: { sessionId },
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        whatsapp: true,
        address: true,
        lastCheckIn: true,
        totalCheckIns: true,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionTitle: session.title,
      items: participants.map((p) => ({
        id: p.id,
        name: p.name,
        whatsapp: p.whatsapp,
        address: p.address,
        lastCheckIn: p.lastCheckIn,
        totalCheckIns: p.totalCheckIns,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
