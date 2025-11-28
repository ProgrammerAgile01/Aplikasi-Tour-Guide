import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken, createAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body?.token ?? "").toString().trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Token magic link tidak valid." },
        { status: 400 }
      );
    }

    const now = new Date();

    const magic = await prisma.magicLoginToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magic) {
      return NextResponse.json(
        { ok: false, message: "Tautan login tidak ditemukan." },
        { status: 404 }
      );
    }

    if (magic.expiresAt <= now) {
      return NextResponse.json(
        { ok: false, message: "Tautan login sudah kedaluwarsa." },
        { status: 410 }
      );
    }

    const user = magic.user;

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, message: "Akun dinonaktifkan." },
        { status: 403 }
      );
    }

    // ambil semua trip yang diikuti user
    const userTrips = await prisma.userTrip.findMany({
      where: { userId: user.id },
      include: { trip: true },
    });

    // ambil participant mapping (untuk isi participantId per trip)
    const participants = await prisma.participant.findMany({
      where: {
        loginUsername: user.username,
        deletedAt: null,
      },
      select: {
        id: true,
        tripId: true,
      },
    });

    const participantByTripId = new Map<string, string>();
    for (const p of participants) {
      participantByTripId.set(p.tripId, p.id);
    }

    // optional: backfill participantId yang masih null
    await Promise.all(
      userTrips.map((ut) => {
        if (ut.participantId) return null;
        const pid = participantByTripId.get(ut.tripId);
        if (!pid) return null;

        return prisma.userTrip.update({
          where: { id: ut.id },
          data: { participantId: pid },
        });
      })
    );

    const tripsPayload = userTrips.map((ut) => ({
      id: ut.trip.id,
      name: ut.trip.name,
      roleOnTrip: ut.roleOnTrip,
      participantId:
        ut.participantId ?? participantByTripId.get(ut.tripId) ?? null,
    }));

    const userPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      whatsapp: user.whatsapp,
      role: user.role,
    };

    const payload = {
      user: userPayload,
      trips: tripsPayload,
    };

    const jwtToken = signToken(payload);
    const cookie = createAuthCookie(jwtToken);

    // update statistik penggunaan, tapi tidak membuat token jadi sekali pakai
    await prisma.magicLoginToken.update({
      where: { id: magic.id },
      data: {
        lastUsedAt: now,
        usageCount: { increment: 1 },
      },
    });

    const res = NextResponse.json({
      ok: true,
      user: userPayload,
      trips: tripsPayload,
    });

    res.headers.set("Set-Cookie", cookie);

    return res;
  } catch (err: any) {
    console.error("POST /api/auth/magic-login error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
