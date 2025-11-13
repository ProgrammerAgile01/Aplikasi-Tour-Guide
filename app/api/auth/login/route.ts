import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, message: "identifier & password required" },
        { status: 400 }
      );
    }

    // Cari User berdasarkan email / whatsapp
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { whatsapp: identifier }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, message: "Account inactive" },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Ambil semua Trip yang diikuti user (via UserTrip)
    const userTrips = await prisma.userTrip.findMany({
      where: { userId: user.id },
      include: { trip: true },
    });

    // Ambil semua Participant yang match dengan user ini
    //    (berdasarkan email / whatsapp) untuk semua trip
    const participants = await prisma.participant.findMany({
      where: {
        OR: [{ loginEmail: user.email }, { whatsapp: user.whatsapp }],
      },
      select: {
        id: true,
        tripId: true,
      },
    });

    // bikin map tripId -> participantId (kalau ada)
    const participantByTripId = new Map<string, string>();
    for (const p of participants) {
      participantByTripId.set(p.tripId, p.id);
    }

    // Bentuk payload trips untuk token & response
    const tripsPayload = userTrips.map((ut) => ({
      id: ut.trip.id,
      name: ut.trip.name,
      roleOnTrip: ut.roleOnTrip,
      participantId: participantByTripId.get(ut.tripId) ?? null,
    }));

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const payload = {
      user: userPayload,
      trips: tripsPayload,
    };

    // Generate JWT + cookie
    const token = signToken(payload);
    const cookie = createAuthCookie(token);

    const res = NextResponse.json({
      ok: true,
      user: userPayload,
      trips: tripsPayload,
    });
    res.headers.set("Set-Cookie", cookie);

    return res;
  } catch (err: any) {
    console.error("login error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
