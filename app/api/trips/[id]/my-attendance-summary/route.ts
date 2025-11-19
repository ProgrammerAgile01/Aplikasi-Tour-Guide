import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

type SessionPayload = {
  user?: {
    id: string;
    role: string;
  };
  trips?: {
    id: string;
    participantId?: string | null;
  }[];
};

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

export async function GET(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  try {
    const payload = getSessionFromRequest(req) as SessionPayload | null;
    if (!payload?.user) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const tripId = await resolveId(req, params);
    if (!tripId)
      return NextResponse.json(
        { ok: false, message: "tripId tidak valid" },
        { status: 400 }
      );

    // cari participantId saya di trip ini dari token
    const tripEntry = payload.trips?.find((t) => t.id === tripId);
    const participantId = tripEntry?.participantId;

    if (!participantId) {
      return NextResponse.json({
        ok: true,
        data: { lastSessionId: null, attendedSessionIds: [] },
      });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        tripId,
        participantId,
      },
      orderBy: { checkedAt: "asc" },
      select: {
        sessionId: true,
        checkedAt: true,
      },
    });

    if (!attendances.length) {
      return NextResponse.json({
        ok: true,
        data: { lastSessionId: null, attendedSessionIds: [] },
      });
    }

    const attendedSessionIds = Array.from(
      new Set(attendances.map((a) => a.sessionId))
    );
    const lastSession = attendances[attendances.length - 1];

    return NextResponse.json({
      ok: true,
      data: {
        lastSessionId: lastSession.sessionId,
        attendedSessionIds,
      },
    });
  } catch (err: any) {
    console.error("GET /my-attendance-summary error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
