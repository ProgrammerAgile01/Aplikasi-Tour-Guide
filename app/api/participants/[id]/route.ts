import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
  note: z.string().trim().optional().or(z.literal("").optional()),
});

async function resolveId(req: Request, params: any) {
  try {
    let resolved = params;
    if (params && typeof params.then === "function") resolved = await params;
    const idFromParams = resolved && (resolved.id ?? resolved["0"]);
    if (idFromParams) return idFromParams;
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
}

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    const item = await prisma.participant.findUnique({ where: { id } });
    if (!item || item.deletedAt)
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan" },
        { status: 404 }
      );

    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    console.error("GET /api/participants/[id] error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    const json = await req.json();
    const data = UpdateParticipantSchema.parse(json);

    const updated = await prisma.$transaction(async (tx) => {
      // 1) Update peserta
      const participant = await tx.participant.update({
        where: { id },
        data: {
          name: data.name,
          whatsapp: data.whatsapp,
          address: data.address,
          note: data.note && data.note.length > 0 ? data.note : null,
        },
      });

      // 2) Cari semua relasi UserTrip yang terhubung ke participant ini
      const links = await tx.userTrip.findMany({
        where: { participantId: id },
        select: { userId: true },
      });

      if (links.length > 0) {
        const userIds = links.map((l) => l.userId);

        // 3) Update semua User terkait:
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: {
            name: data.name,
            whatsapp: data.whatsapp,
          },
        });
      }

      return participant;
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    console.error("PUT /api/participants/[id] error:", err);

    // validasi zod
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }

    // prisma: record tidak ditemukan
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    // prisma: unique constraint (misal whatsapp bentrok di tabel User)
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Nomor WhatsApp sudah digunakan akun lain, silakan gunakan nomor lain.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    await prisma.participant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/participants/[id] error:", err);
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
