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

    // fetch userTrips to include trips
    const userTrips = await prisma.userTrip.findMany({
      where: { userId: user.id },
      include: { trip: true },
    });

    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      trips: userTrips.map((ut) => ({
        id: ut.trip.id,
        name: ut.trip.name,
        roleOnTrip: ut.roleOnTrip,
      })),
    };

    const token = signToken(payload);
    const cookie = createAuthCookie(token);

    const res = NextResponse.json({
      ok: true,
      user: payload.user,
      trips: payload.trips,
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