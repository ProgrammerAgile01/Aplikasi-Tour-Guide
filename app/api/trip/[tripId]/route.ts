// app/api/trips/[tripId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { tripId: string } }
) {
  const id = params?.tripId?.toString();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id },
    // pastikan SELECT name!
    select: { id: true, name: true, status: true },
  });

  if (!trip) {
    return NextResponse.json(
      { ok: false, message: "Trip tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: trip });
}
