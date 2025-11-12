import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CreateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
  tripId: z.string().trim().min(1),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") ?? undefined;
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const where: any = { tripId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        take,
        skip,
      }),
      prisma.participant.count({ where }),
    ]);

    return NextResponse.json({ ok: true, total, items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = CreateParticipantSchema.parse(json);

    // optional: verify trip exists
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    const created = await prisma.participant.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        address: data.address,
        tripId: data.tripId,
      },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
