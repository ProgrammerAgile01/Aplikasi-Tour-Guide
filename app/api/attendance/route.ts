import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth"; // sesuaikan dengan path auth kamu

export async function GET(req: Request) {
  try {
    // --- AUTH: hanya ADMIN yang boleh ---
    const session = await getSessionFromRequest(req);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const sessionId = searchParams.get("sessionId"); // <== penting: filter per sesi
    const methodParam = searchParams.get("method") ?? "all"; // "all" | "geo" | "qr" | "admin"

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    const where: any = {
      tripId,
    };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (methodParam && methodParam !== "all") {
      // ENUM di Prisma: GEO, QR, ADMIN
      if (methodParam === "geo") where.method = "GEO";
      else if (methodParam === "qr") where.method = "QR";
      else if (methodParam === "admin") where.method = "ADMIN";
    }

    const rows = await prisma.attendance.findMany({
      where,
      orderBy: { checkedAt: "desc" },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            location: true,
          },
        },
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      participantName: r.participant?.name ?? "-",
      sessionTitle: r.session?.title ?? "-",
      location: r.session?.location ?? "-",
      method: r.method === "GEO" ? "geo" : r.method === "QR" ? "qr" : "admin", // fallback
      timestamp: r.checkedAt.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "present" as const, // kalau sudah ada record berarti HADIR
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("GET /api/attendance error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
