// app/api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  day: z.coerce.number().int().min(1).optional(),
  dateText: z.string().trim().min(1).optional(),
  timeText: z.string().trim().min(1).optional(),
  category: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  locationMapUrl: z.string().url().optional().nullable(),
  locationLat: z.coerce.number().optional().nullable(),
  locationLon: z.coerce.number().optional().nullable(),
  hints: z.array(z.string().trim()).optional(),
  description: z.string().trim().optional(),
  isChanged: z.coerce.boolean().optional(),
  isAdditional: z.coerce.boolean().optional(),
});

// === Util OSM (sama seperti di index route) ===
function clampZoom(z?: number) {
  const n = Math.floor(Number.isFinite(z as number) ? (z as number) : 17);
  return Math.min(19, Math.max(1, n || 17));
}
function toFixed6(n: number) {
  return Number(n).toFixed(6);
}
function osmPermalink(lat: number, lon: number, zoom = 17) {
  const z = clampZoom(zoom);
  const la = toFixed6(lat);
  const lo = toFixed6(lon);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=${z}/${la}/${lo}`;
}
function osmSearchUrl(q: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const { id } = await ctx.params;
  const safeId = id?.trim();
  if (!safeId)
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );

  try {
    const item = await prisma.schedule.findUnique({ where: { id: safeId } });
    if (!item)
      return NextResponse.json(
        { ok: false, message: "Jadwal tidak ditemukan." },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await ctx.params;
    const safeId = id?.trim();
    if (!safeId) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi pada URL." },
        { status: 400 }
      );
    }

    const json = await req.json();
    const data = UpdateSchema.parse(json);

    const fallbackUrl =
      typeof data.locationLat === "number" &&
      typeof data.locationLon === "number"
        ? osmPermalink(data.locationLat, data.locationLon, 17)
        : data.location
        ? osmSearchUrl(data.location)
        : undefined;

    const dataToSave = {
      ...data,
      locationMapUrl: data.locationMapUrl ?? fallbackUrl,
      locationLat:
        typeof data.locationLat === "number" ? data.locationLat : undefined,
      locationLon:
        typeof data.locationLon === "number" ? data.locationLon : undefined,
    };

    const updated = await prisma.schedule.update({
      where: { id: safeId },
      data: dataToSave,
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Jadwal tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const { id } = await ctx.params;
  const safeId = id?.trim();
  if (!safeId)
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );

  try {
    await prisma.schedule.delete({ where: { id: safeId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Jadwal tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
