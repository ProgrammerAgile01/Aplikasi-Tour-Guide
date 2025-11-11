// app/api/schedules/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  tripId: z.string().trim().min(1),
  day: z.coerce.number().int().min(1),
  dateText: z.string().trim().min(1),
  timeText: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().optional(),
  isChanged: z.coerce.boolean().optional().default(false),
  isAdditional: z.coerce.boolean().optional().default(false),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId")?.trim();
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi." },
        { status: 400 }
      );
    }

    const day = searchParams.get("day");
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 200);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where = {
      tripId,
      ...(day ? { day: Number(day) || undefined } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { dateText: { contains: q, mode: "insensitive" } },
              { timeText: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: [
          { day: "asc" },
          { dateText: "asc" },
          { timeText: "asc" },
          { createdAt: "asc" },
        ],
        take,
        skip,
      }),
      prisma.schedule.count({ where }),
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
    const body = await req.json();
    const data = CreateSchema.parse(body);

    // Pastikan trip ada
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan." },
        { status: 404 }
      );
    }

    const created = await prisma.schedule.create({
      data: {
        tripId: data.tripId,
        day: data.day,
        dateText: data.dateText,
        timeText: data.timeText,
        title: data.title,
        location: data.location,
        description: data.description,
        isChanged: data.isChanged,
        isAdditional: data.isAdditional,
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
