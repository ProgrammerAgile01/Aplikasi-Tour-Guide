import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const Query = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

const Body = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["NORMAL", "IMPORTANT"]).default("NORMAL"),
  isPinned: z.boolean().default(false),
});

/** Cari tripId asli di DB dari “short id” yang datang dari URL. */
async function resolveTripId(raw: string) {
  const base = decodeURIComponent(raw).trim();

  // 1) coba match persis / variasi umum
  const candidates = Array.from(
    new Set([
      base,
      base.toLowerCase(),
      base.toUpperCase(),
      base.startsWith("trip-") ? base.slice(5) : `trip-${base}`,
    ])
  );

  const direct = await prisma.trip.findFirst({
    where: { id: { in: candidates }, deletedAt: null },
    select: { id: true },
  });
  if (direct) return direct.id;

  // 2) fallback: cari trip yang id-nya mengandung / berakhiran base
  const fuzzy = await prisma.trip.findFirst({
    where: {
      OR: [{ id: { endsWith: base } }, { id: { contains: base } }], deletedAt: null
    },
    orderBy: { createdAt: "desc" }, // kalau ada banyak, ambil yang terbaru
    select: { id: true },
  });
  return fuzzy?.id ?? null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ tripId?: string }> }
) {
  const { tripId } = await ctx.params;
  if (!tripId) {
    return NextResponse.json(
      { ok: false, message: "tripId kosong" },
      { status: 400 }
    );
  }

  const realTripId = await resolveTripId(tripId);
  if (!realTripId) {
    return NextResponse.json({ ok: true, total: 0, items: [] });
  }

  const sp = new URL(req.url).searchParams;
  const { take, skip } = Query.parse({
    take: sp.get("take") ?? undefined,
    skip: sp.get("skip") ?? undefined,
  });

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where: { tripId: realTripId },
      orderBy: [
        { isPinned: "desc" },
        { priority: "desc" }, // IMPORTANT > NORMAL
        { createdAt: "desc" },
      ],
      take,
      skip,
    }),
    prisma.announcement.count({ where: { tripId: realTripId } }),
  ]);

  return NextResponse.json({ ok: true, total, items });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ tripId?: string }> }
) {
  const { tripId } = await ctx.params;
  if (!tripId) {
    return NextResponse.json(
      { ok: false, message: "tripId kosong" },
      { status: 400 }
    );
  }

  const realTripId = await resolveTripId(tripId);
  if (!realTripId) {
    return NextResponse.json(
      { ok: false, message: "Trip tidak ditemukan" },
      { status: 404 }
    );
  }

  try {
    const body = Body.parse(await req.json());
    const created = await prisma.announcement.create({
      data: { ...body, tripId: realTripId },
    });
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
