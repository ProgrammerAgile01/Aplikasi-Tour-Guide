// app/api/trips/[id]/sessions
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

async function resolveId(req: Request, params: any) {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p && (p.id ?? p["0"]);
    if (idFromParams) return idFromParams;
  } catch {}
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 2]; // .../trips/[id]/sessions
}

export async function GET(req: Request, { params }: { params: any }) {
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

    const tripId = await resolveId(req, params);
    if (!tripId)
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );

    // Pastikan trip ada (opsional)
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip)
      return NextResponse.json(
        { ok: false, message: "Trip not found" },
        { status: 404 }
      );

    const items = await prisma.schedule.findMany({
      where: { tripId },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
      select: { id: true, title: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
