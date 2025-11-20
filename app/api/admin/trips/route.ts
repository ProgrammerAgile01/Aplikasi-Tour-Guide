import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

function ensureAdmin(payload: any) {
  if (!payload?.user || payload.user.role === "PESERTA") {
    throw new Error("Forbidden");
  }
}

export async function GET(req: Request) {
  try {
    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    ensureAdmin(payload);

    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, items: trips });
  } catch (e: any) {
    if (e.message === "Forbidden") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("GET /api/admin/trips error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
