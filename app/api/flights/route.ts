import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const q = searchParams.get("q")?.trim();
    const direction = searchParams.get("direction"); // DEPARTURE / RETURN
    const role = searchParams.get("role"); // PESERTA / TL_AGENT

    if (!tripId) {
      return NextResponse.json(
        { ok: false, error: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    const where: any = {
      tripId,
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { passengerName: { contains: q } },
        { orderId: { contains: q } },
        { ticketNumber: { contains: q } },
        { flightNumber1: { contains: q } },
        { airline1: { contains: q } },
      ];
    }

    if (direction === "DEPARTURE" || direction === "RETURN") {
      where.direction = direction;
    }

    if (role === "PESERTA" || role === "TL_AGENT") {
      where.role = role;
    }

    const flights = await prisma.flight.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: flights });
  } catch (err: any) {
    console.error("GET /api/flights error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      tripId,
      passengerName,
      role,
      orderId,
      flightNumber1,
      flightNumber2,
      airline1,
      airline2,
      ticketNumber,
      direction,
      notes,
      participantId,
    } = body;

    if (!tripId) {
      return NextResponse.json(
        { ok: false, error: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    if (
      !passengerName ||
      !flightNumber1 ||
      !airline1 ||
      !ticketNumber ||
      !direction ||
      !role
    ) {
      return NextResponse.json(
        { ok: false, error: "Field wajib belum lengkap" },
        { status: 400 }
      );
    }

    if (!["DEPARTURE", "RETURN"].includes(direction)) {
      return NextResponse.json(
        { ok: false, error: "direction tidak valid" },
        { status: 400 }
      );
    }

    if (!["PESERTA", "TL_AGENT"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "role tidak valid" },
        { status: 400 }
      );
    }

    const flight = await prisma.flight.create({
      data: {
        tripId,
        passengerName,
        role,
        orderId: orderId || null,
        flightNumber1,
        flightNumber2: flightNumber2 || null,
        airline1,
        airline2: airline2 || null,
        ticketNumber,
        direction,
        notes: notes || null,
        participantId: participantId || null,
      },
    });

    return NextResponse.json({ ok: true, data: flight });
  } catch (err: any) {
    console.error("POST /api/flights error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
