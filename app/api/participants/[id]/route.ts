import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
});

// helper: unwrap params if it's a Promise, else return as-is.
// also fallback to parse id from request url path if everything else fails.
async function resolveId(req: Request, params: any) {
  try {
    let resolved = params;
    if (params && typeof params.then === "function") {
      resolved = await params;
    }
    const idFromParams = resolved && (resolved.id ?? resolved["0"]);
    if (idFromParams) return idFromParams;

    // fallback: parse last segment of pathname
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
    if (!item)
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

    const updated = await prisma.participant.update({
      where: { id },
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        address: data.address,
      },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    console.error("PUT /api/participants/[id] error:", err);
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }
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

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    await prisma.participant.delete({ where: { id } });
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
