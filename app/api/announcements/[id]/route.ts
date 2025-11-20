import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  priority: z.enum(["normal", "important"]).optional(), // FE kirim lowercase
  isPinned: z.coerce.boolean().optional(),
});

function toEnumUpper(p: "normal" | "important") {
  return (p === "important" ? "IMPORTANT" : "NORMAL") as "IMPORTANT" | "NORMAL";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );
  }
  try {
    const a = await prisma.announcement.findUnique({ where: { id } });
    if (!a || a.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Tidak ditemukan." },
        { status: 404 }
      );
    return NextResponse.json({
      ok: true,
      item: { ...a, priority: String(a.priority).toLowerCase() }, // map ke lowercase
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi pada URL." },
        { status: 400 }
      );
    }
    const json = await req.json();
    const payload = UpdateSchema.parse(json);

    const data: Record<string, any> = {};
    if (typeof payload.title !== "undefined") data.title = payload.title;
    if (typeof payload.content !== "undefined") data.content = payload.content;
    if (typeof payload.priority !== "undefined")
      data.priority = toEnumUpper(payload.priority);
    if (typeof payload.isPinned !== "undefined")
      data.isPinned = payload.isPinned;

    const updated = await prisma.announcement.update({ where: { id }, data });
    return NextResponse.json({
      ok: true,
      item: { ...updated, priority: String(updated.priority).toLowerCase() },
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: e.issues },
        { status: 400 }
      );
    }
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Pengumuman tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );
  }
  try {
    await prisma.announcement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Pengumuman tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
