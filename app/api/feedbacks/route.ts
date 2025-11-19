// app/api/feedbacks/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

type SessionPayload = {
  user?: {
    id: string;
    role: string;
    username?: string | null;
    name?: string | null;
  };
};

export async function GET(req: Request) {
  try {
    // cek session
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // ambil tripId dari query
    const url = new URL(req.url);
    const tripId = url.searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Parameter tripId wajib diisi" },
        { status: 400 }
      );
    }

    // ambil feedback + relasi participant
    const feedbacks = await prisma.feedback.findMany({
      where: { tripId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // hitung statistik
    const total = feedbacks.length;
    const sumRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const avgRating = total > 0 ? sumRating / total : null;

    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const fb of feedbacks) {
      if (fb.rating >= 1 && fb.rating <= 5) {
        byRating[fb.rating] = (byRating[fb.rating] ?? 0) + 1;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        items: feedbacks,
        stats: {
          total,
          avgRating,
          byRating,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/feedbacks error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
