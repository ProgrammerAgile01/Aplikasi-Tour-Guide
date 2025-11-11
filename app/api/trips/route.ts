// app/api/trips/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CreateTripSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: z.enum(["ongoing", "completed"]),
  description: z.string().trim().min(1),
  startDate: z.string().trim().min(1), // yyyy-mm-dd
  endDate: z.string().trim().min(1), // yyyy-mm-dd
  location: z.string().trim().min(1),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "ongoing" | "completed" | null;
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 50);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take,
        skip,
      }),
      prisma.trip.count({ where }),
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
    const data = CreateTripSchema.parse(json);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { ok: false, message: "Tanggal tidak valid." },
        { status: 400 }
      );
    }

    const created = await prisma.trip.create({
      data: {
        id: data.id,
        name: data.name,
        status: data.status,
        description: data.description,
        startDate: start,
        endDate: end,
        location: data.location,
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
    if (err?.code === "P2002") {
      return NextResponse.json(
        { ok: false, message: "ID trip sudah digunakan." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
