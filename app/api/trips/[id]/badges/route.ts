import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

async function resolveId(req: Request, params: any) {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p && (p.id ?? p["0"]);
    if (idFromParams) return idFromParams;
  } catch {}
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 2]; // .../trips/[id]/badges
}

function buildConditionLabel(d: any): string {
  switch (d.conditionType) {
    case "CHECKIN_SESSION":
      return "Check-in di lokasi";
    case "GALLERY_UPLOAD_SESSION":
      return `Upload ${d.targetValue ?? 1} foto`;
    case "COMPLETE_ALL_SESSIONS":
      return "Selesaikan semua agenda";
    default:
      return "";
  }
}

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const tripId = await resolveId(req, params);

    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const tripInfo = Array.isArray(payload.trips)
      ? payload.trips.find((t: any) => t.id === tripId)
      : null;
    if (!tripInfo || !tripInfo.participantId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Anda tidak terdaftar sebagai peserta trip ini.",
        },
        { status: 403 }
      );
    }

    const participantId = tripInfo.participantId;

    const defs = await prisma.badgeDefinition.findMany({
      where: { tripId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const unlocked = await prisma.participantBadge.findMany({
      where: { tripId, participantId },
    });

    const unlockedMap = new Map(
      unlocked.map((u) => [u.badgeId, u.unlockedAt.toISOString()])
    );

    const items = defs.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      icon: d.icon,
      location: d.location ?? "",
      condition: buildConditionLabel(d),
      unlocked: unlockedMap.has(d.id),
      unlockedAt: unlockedMap.get(d.id) ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("GET /api/trips/[id]/badges error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
