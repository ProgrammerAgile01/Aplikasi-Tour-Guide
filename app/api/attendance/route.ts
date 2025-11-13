import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["token"];
    const auth = verifyToken(token);
    if (!auth)
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );

    const role = String(auth.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") || undefined;
    const method = searchParams.get("method") || undefined;

    const where: any = {};
    if (tripId) where.tripId = tripId;
    if (method && method !== "all") where.method = method.toUpperCase();

    const items = await prisma.attendance.findMany({
      where,
      orderBy: { checkedAt: "desc" },
    });

    // Enrich untuk UI
    const rows = await Promise.all(
      items.map(async (a) => {
        const [p, s] = await Promise.all([
          prisma.participant.findUnique({ where: { id: a.participantId } }),
          prisma.schedule.findUnique({ where: { id: a.sessionId } }),
        ]);
        return {
          id: a.id,
          participantName: p?.name ?? "-",
          sessionTitle: s?.title ?? "-",
          location: s?.location ?? "-",
          method: a.method.toLowerCase(),
          timestamp: new Date(a.checkedAt).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "present",
        };
      })
    );

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
