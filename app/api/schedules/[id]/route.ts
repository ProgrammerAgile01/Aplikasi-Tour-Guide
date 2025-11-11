// app/api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  day: z.coerce.number().int().min(1).optional(),
  dateText: z.string().trim().min(1).optional(),
  timeText: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  isChanged: z.coerce.boolean().optional(),
  isAdditional: z.coerce.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id?: string }> }
) {
  const { id } = await ctx.params; // ⬅️ penting: await!
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
    const { id } = await ctx.params; // ⬅️ penting: await!
    const safeId = id?.trim();
    if (!safeId) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi pada URL." },
        { status: 400 }
      );
    }

    const json = await req.json();
    const data = UpdateSchema.parse(json);

    const updated = await prisma.schedule.update({
      where: { id: safeId },
      data,
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
  const { id } = await ctx.params; // ⬅️ penting: await!
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
