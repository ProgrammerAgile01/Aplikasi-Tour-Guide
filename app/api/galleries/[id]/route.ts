// app/api/galleries/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateBodySchema = z.object({
  note: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(2048).optional(),
  status: z.enum(["PENDING", "APPROVED"]).optional(),
});

function mapGallery(row: any) {
  return {
    id: row.id,
    tripId: row.tripId,
    participantId: row.participantId,
    participantName: row.participant.name,
    participantWhatsapp: row.participant.whatsapp,
    sessionId: row.sessionId,
    sessionTitle: row.session.title,
    sessionLocation: row.session.location,
    note: row.note,
    imageUrl: row.imageUrl,
    status: row.status,
    createdAt: row.createdAt,
  };
}

type IdParams = { params: Promise<{ id?: string }> };

// PUT /api/galleries/[id]  (edit / approve)
export async function PUT(req: Request, { params }: IdParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Gallery id kosong." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = UpdateBodySchema.parse(body);

    const updated = await prisma.gallery.update({
      where: { id },
      data: {
        note: data.note ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        status: data.status ?? undefined,
      },
      include: {
        participant: true,
        session: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: mapGallery(updated),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Gagal mengubah galeri" },
      { status: 500 }
    );
  }
}

// DELETE /api/galleries/[id]
export async function DELETE(req: Request, { params }: IdParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Gallery id kosong." },
        { status: 400 }
      );
    }

    await prisma.gallery.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Gagal menghapus galeri" },
      { status: 500 }
    );
  }
}
