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
  return parts[parts.length - 2];
}

export async function GET(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  try {
    const session = getSessionFromRequest(req) as any;

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Tidak terautentikasi" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const tripId = await resolveId(req, params);

    const userTrip = await prisma.userTrip.findFirst({
      where: { userId, tripId },
      include: {
        participant: true,
        user: true,
      },
    });

    if (!userTrip) {
      return NextResponse.json(
        { ok: false, message: "Peserta untuk trip ini tidak ditemukan" },
        { status: 404 }
      );
    }

    const { user, participant } = userTrip;

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          whatsapp: user.whatsapp,
          role: user.role,
        },
        participant: participant
          ? {
              id: participant.id,
              name: participant.name,
              whatsapp: participant.whatsapp,
              address: participant.address,
              lastCheckIn: participant.lastCheckIn,
              totalCheckIns: participant.totalCheckIns,
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error("GET /api/trips/[tripId]/me error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
