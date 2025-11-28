import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

const QuerySchema = z.object({
  tripId: z.string().trim().min(1),
});

const CreateBodySchema = z.object({
  participantId: z.string().trim().min(1).optional().nullable(),
  sessionId: z.string().trim().min(1),
  note: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().min(1),
});

function mapGallery(row: any) {
  const isAdmin = !!row.uploaderUserId;

  return {
    id: row.id,
    tripId: row.tripId,

    participantId: row.participantId ?? null,
    participantName: row.participant?.name ?? null,
    participantWhatsapp: row.participant?.whatsapp ?? null,

    uploaderUserId: row.uploaderUserId ?? null,
    uploaderName: row.uploaderName ?? null,

    sessionId: row.sessionId,
    sessionTitle: row.session.title,
    sessionLocation: row.session.location,
    note: row.note,
    imageUrl: row.imageUrl,
    status: row.status,
    createdAt: row.createdAt,
  };
}

// GET /api/galleries?tripId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const parsed = QuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Param tripId wajib diisi." },
        { status: 400 }
      );
    }

    const { tripId } = parsed.data;

    const rows = await prisma.gallery.findMany({
      where: { tripId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        participant: true,
        session: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: rows.map(mapGallery),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Gagal memuat galeri" },
      { status: 500 }
    );
  }
}

// POST /api/galleries
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateBodySchema.parse(body);

    // Ambil tripId dari session/jadwal
    const schedule = await prisma.schedule.findUnique({
      where: { id: data.sessionId },
      select: { tripId: true, deletedAt: true },
    });

    if (!schedule || schedule.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Sesi / jadwal tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cek user admin yang login
    const session = getSessionFromRequest(req) as any;
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Tidak terautentikasi sebagai admin" },
        { status: 401 }
      );
    }

    const isAdminUpload = !data.participantId; // kalau tidak ada participantId → foto official admin

    // siapkan data untuk create
    const baseData: any = {
      tripId: schedule.tripId,
      sessionId: data.sessionId,
      note: data.note ?? undefined,
      imageUrl: data.imageUrl,
      status: "APPROVED", // admin upload langsung approve
    };

    if (isAdminUpload) {
      baseData.uploaderUserId = user.id;
      baseData.uploaderName = user.name ?? user.username ?? "Admin";
    } else {
      baseData.participantId = data.participantId!;
    }

    const created = await prisma.gallery.create({
      data: baseData,
      include: {
        participant: true,
        session: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: mapGallery(created),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Gagal menambah galeri" },
      { status: 500 }
    );
  }
}
