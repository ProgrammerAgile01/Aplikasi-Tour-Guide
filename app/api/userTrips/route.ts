import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const AssignSchema = z.object({
  userId: z.string().min(1),
  tripId: z.string().min(1),
  roleOnTrip: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = AssignSchema.parse(json);

    // ensure user & trip exist
    const [user, trip] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId } }),
      prisma.trip.findUnique({ where: { id: data.tripId } }),
    ]);

    if (!user || !trip) {
      return NextResponse.json(
        { ok: false, message: "User or Trip not found" },
        { status: 404 }
      );
    }

    const created = await prisma.userTrip.upsert({
      where: { userId_tripId: { userId: data.userId, tripId: data.tripId } },
      update: { roleOnTrip: data.roleOnTrip ?? "PESERTA" },
      create: {
        userId: data.userId,
        tripId: data.tripId,
        roleOnTrip: data.roleOnTrip ?? "PESERTA",
      },
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (err: any) {
    console.error("POST /api/userTrips error", err);
    if (err?.name === "ZodError")
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const tripId = searchParams.get("tripId");
    if (!userId || !tripId)
      return NextResponse.json(
        { ok: false, message: "userId & tripId required" },
        { status: 400 }
      );

    await prisma.userTrip.delete({
      where: { userId_tripId: { userId, tripId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/userTrips error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
