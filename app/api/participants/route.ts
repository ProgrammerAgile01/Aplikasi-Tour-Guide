import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const CreateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
  note: z.string().trim().optional().or(z.literal("").optional()),
  nik: z.string().trim().optional().or(z.literal("").optional()),
  birthPlace: z.string().trim().optional().or(z.literal("").optional()),
  birthDate: z.string().trim().optional().or(z.literal("").optional()), // "YYYY-MM-DD"
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  roomNumber: z.string().trim().optional().or(z.literal("").optional()),
  tripId: z.string().trim().min(1),
});

function generateUsernameFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${slug}_${rnd}`;
}

function generateRandomPassword(len = 10) {
  return crypto
    .randomBytes(Math.ceil(len * 0.6))
    .toString("base64")
    .slice(0, len);
}

// ==================== GET /api/participants ====================

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") ?? undefined;
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const where: any = { tripId, deletedAt: null };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
        { nik: { contains: q, mode: "insensitive" } },
        { birthPlace: { contains: q, mode: "insensitive" } },
        { roomNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        take,
        skip,
      }),
      prisma.participant.count({ where }),
    ]);

    return NextResponse.json({ ok: true, total, items });
  } catch (err: any) {
    console.error("GET /api/participants error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

// ==================== POST /api/participants ====================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateParticipantSchema.parse(body);

    // cek trip
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    const birthDate =
      data.birthDate && data.birthDate.length > 0
        ? new Date(data.birthDate)
        : null;

    // ==================== USER BARU SELALU ====================

    const username = generateUsernameFromName(data.name);
    const rawPassword = generateRandomPassword(10);
    const hashed = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        name: data.name,
        whatsapp: data.whatsapp, // boleh sama dengan user lain, tidak unique
        role: "PESERTA",
        isActive: true,
      },
    });

    // ==================== PARTICIPANT ====================

    const createdParticipant = await prisma.participant.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        address: data.address,
        note: data.note && data.note.length > 0 ? data.note : null,
        nik: data.nik && data.nik.length > 0 ? data.nik : null,
        birthPlace:
          data.birthPlace && data.birthPlace.length > 0
            ? data.birthPlace
            : null,
        birthDate,
        gender: data.gender ?? null,
        roomNumber:
          data.roomNumber && data.roomNumber.length > 0
            ? data.roomNumber
            : null,
        tripId: data.tripId,

        // selalu link ke username user yang baru dibuat
        loginUsername: username,
        // simpan password awal untuk nanti dikirim via WA / ditampilkan ke admin
        initialPassword: rawPassword,
      },
    });

    // ==================== USERTRIP LINK ====================

    await prisma.userTrip.create({
      data: {
        userId: user.id,
        tripId: data.tripId,
        roleOnTrip: "PESERTA",
        participantId: createdParticipant.id,
      },
    });

    const userResp = {
      id: user.id,
      username: user.username,
      name: user.name,
      whatsapp: user.whatsapp,
      role: user.role,
      isActive: user.isActive,
    };

    // TIDAK kirim WA di sini — kirimnya lewat endpoint khusus send-credentials
    return NextResponse.json(
      {
        ok: true,
        participant: createdParticipant,
        user: { ...userResp, plainPassword: rawPassword },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/participants error", err);
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
