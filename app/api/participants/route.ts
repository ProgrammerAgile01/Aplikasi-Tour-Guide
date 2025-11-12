import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const CreateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
  tripId: z.string().trim().min(1),
});

function generateEmailFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${rnd}@trip.com`;
}

function generateRandomPassword(len = 10) {
  return crypto
    .randomBytes(Math.ceil(len * 0.6))
    .toString("base64")
    .slice(0, len);
}

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

    const where: any = { tripId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateParticipantSchema.parse(body);

    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek user by whatsapp
    let user = await prisma.user
      .findUnique({ where: { whatsapp: data.whatsapp } })
      .catch(() => null);

    let plainPassword: string | undefined;
    let loginEmailForParticipant: string | undefined;

    if (user) {
      // User sudah ada → update nama/whatsapp bila perlu
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: data.name, whatsapp: data.whatsapp },
      });
      // Tidak membuat password baru. Biarkan kolom initialPassword participant tetap null (atau tetap nilai lama jika sebelumnya tercatat).
    } else {
      // Buat user baru + password awal
      const email = generateEmailFromName(data.name);
      const rawPassword = generateRandomPassword(10);
      const hashed = await bcrypt.hash(rawPassword, 10);

      const createdUser = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name: data.name,
          whatsapp: data.whatsapp,
          role: "PESERTA",
          isActive: true,
        },
      });

      user = createdUser;
      plainPassword = rawPassword;
      loginEmailForParticipant = email;
    }

    // Buat participant (sekaligus simpan credential awal jika user baru)
    const createdParticipant = await prisma.participant.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        address: data.address,
        tripId: data.tripId,
        ...(plainPassword && loginEmailForParticipant
          ? {
              loginEmail: loginEmailForParticipant,
              initialPassword: plainPassword,
              initialPasswordAt: new Date(),
            }
          : {}),
      },
    });

    // Pastikan relasi UserTrip (user ↔ trip)
    const link = await prisma.userTrip.findUnique({
      where: { userId_tripId: { userId: user.id, tripId: data.tripId } },
    });
    if (!link) {
      await prisma.userTrip.create({
        data: { userId: user.id, tripId: data.tripId, roleOnTrip: "PESERTA" },
      });
    }

    const userResp = {
      id: user.id,
      email: user.email,
      name: user.name,
      whatsapp: user.whatsapp,
      role: user.role,
      isActive: user.isActive,
    };

    return NextResponse.json(
      {
        ok: true,
        participant: createdParticipant, // berisi loginEmail/initialPassword bila baru
        user: { ...userResp, plainPassword },
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
