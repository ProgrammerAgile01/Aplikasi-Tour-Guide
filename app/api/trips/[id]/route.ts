// app/api/trips/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateTripSchema = z.object({
  id: z.string().trim().optional(), // <- backup kalau id dikirim di body
  name: z.string().trim().min(1).optional(),
  status: z.enum(["ongoing", "completed"]).optional(),
  description: z.string().trim().min(1).optional(),
  startDate: z.string().trim().min(1).optional(), // yyyy-mm-dd
  endDate: z.string().trim().min(1).optional(), // yyyy-mm-dd
  location: z.string().trim().min(1).optional(),
});

function extractIdFrom(req: Request, params?: { id?: string }) {
  // 1) path param
  const fromParam = params?.id?.trim();
  if (fromParam) return fromParam;

  // 2) query ?id=
  const u = new URL(req.url);
  const fromQuery = u.searchParams.get("id")?.trim();
  if (fromQuery) return fromQuery;

  // 3) (body dihandle di PATCH di bawah)
  return "";
}

export async function GET(
  req: Request,
  { params }: { params: { id?: string } }
) {
  const id = extractIdFrom(req, params);
  if (!id)
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );

  try {
    const item = await prisma.trip.findUnique({ where: { id } });
    if (!item)
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan." },
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
  req: Request,
  { params }: { params: { id?: string } }
) {
  try {
    // baca body dulu supaya bisa ambil id fallback dari body
    const json = await req.json();
    const payload = UpdateTripSchema.parse(json);

    // gabungkan semua kemungkinan sumber id
    let id = extractIdFrom(req, params);
    if (!id && payload.id) id = payload.id.trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib diisi pada URL atau body." },
        { status: 400 }
      );
    }

    const data: any = { ...payload };
    delete data.id; // pastikan tidak mengupdate kolom id

    if (payload.startDate) {
      const d = new Date(payload.startDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Tanggal mulai tidak valid." },
          { status: 400 }
        );
      }
      data.startDate = d;
    }
    if (payload.endDate) {
      const d = new Date(payload.endDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Tanggal selesai tidak valid." },
          { status: 400 }
        );
      }
      data.endDate = d;
    }

    const updated = await prisma.trip.update({
      where: { id },
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
        { ok: false, message: "Trip tidak ditemukan." },
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
  req: Request,
  { params }: { params: { id?: string } }
) {
  const id = extractIdFrom(req, params);
  if (!id)
    return NextResponse.json(
      { ok: false, message: "ID wajib diisi." },
      { status: 400 }
    );

  try {
    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
