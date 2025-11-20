// app/api/trip/[tripId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const id = tripId?.toString();

  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, deletedAt: true },
  });

  if (!trip || trip.deletedAt) {
    return NextResponse.json(
      { ok: false, message: "Trip tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: trip });
}
