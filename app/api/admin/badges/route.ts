import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

function ensureAdmin(payload: any) {
  if (!payload?.user || payload.user.role === "PESERTA") {
    throw new Error("Forbidden");
  }
}

const BadgeBody = z.object({
  tripId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  location: z.string().optional().nullable(),
  conditionType: z.enum([
    "CHECKIN_SESSION",
    "GALLERY_UPLOAD_SESSION",
    "COMPLETE_ALL_SESSIONS",
  ]),
  targetValue: z.coerce.number().int().min(1).optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

// GET /api/admin/badges?tripId=xxx
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

    const url = new URL(req.url);
    const tripId = url.searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId query wajib diisi" },
        { status: 400 }
      );
    }

    const defs = await prisma.badgeDefinition.findMany({
      where: { tripId },
      include: {
        session: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      items: defs.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        icon: d.icon,
        location: d.location,
        conditionType: d.conditionType,
        targetValue: d.targetValue,
        sessionId: d.sessionId,
        sessionTitle: d.session?.title ?? null,
        isActive: d.isActive,
      })),
    });
  } catch (e: any) {
    if (e.message === "Forbidden") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("GET /api/admin/badges error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/badges
export async function POST(req: Request) {
  try {
    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    ensureAdmin(payload);

    const body = await req.json();
    const parsed = BadgeBody.parse(body);

    const def = await prisma.badgeDefinition.create({
      data: {
        tripId: parsed.tripId,
        code: parsed.code,
        name: parsed.name,
        description: parsed.description,
        icon: parsed.icon,
        location: parsed.location ?? null,
        conditionType: parsed.conditionType as any,
        targetValue: parsed.targetValue ?? null,
        sessionId: parsed.sessionId ?? null,
      },
    });

    return NextResponse.json({ ok: true, item: def });
  } catch (e: any) {
    if (e.message === "Forbidden") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("POST /api/admin/badges error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
