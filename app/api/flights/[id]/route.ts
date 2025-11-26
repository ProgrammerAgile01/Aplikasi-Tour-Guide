import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

// Context params di Next 15 bisa berupa Promise, jadi WAJIB di-await
type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: ParamsPromise) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: rawId } = await params; 
    const id = decodeURIComponent(rawId);

    const body = await req.json();
    const {
      passengerName,
      role,
      orderId,
      flightNumber1,
      flightNumber2,
      airline1,
      airline2,
      ticketNumber,
      direction,
      notes,
    } = body;

    if (!passengerName || !flightNumber1 || !airline1 || !ticketNumber) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nama, pesawat 1, maskapai 1, dan nomor tiket wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Pastikan record-nya ada & belum soft-deleted
    const existing = await prisma.flight.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Data penerbangan tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.flight.update({
      where: { id },
      data: {
        passengerName,
        role: role === "TL_AGENT" ? "TL_AGENT" : "PESERTA",
        orderId: orderId || null,
        flightNumber1,
        flightNumber2: flightNumber2 || null,
        airline1,
        airline2: airline2 || null,
        ticketNumber,
        direction: direction === "RETURN" ? "RETURN" : "DEPARTURE",
        notes: notes || null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Data penerbangan diperbarui",
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/flights/[id] error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memperbarui data penerbangan" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: ParamsPromise) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: rawId } = await params; // ✅ di-await
    const id = decodeURIComponent(rawId);

    // Cek dulu, hanya yang belum deletedAt
    const existing = await prisma.flight.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Data penerbangan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Soft delete: isi deletedAt, bukan delete permanen
    await prisma.flight.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      message: "Data penerbangan berhasil dihapus",
    });
  } catch (err: any) {
    console.error("DELETE /api/flights/[id] error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal menghapus data penerbangan" },
      { status: 500 }
    );
  }
}
