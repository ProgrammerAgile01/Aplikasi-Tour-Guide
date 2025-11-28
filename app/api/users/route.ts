import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  name: z.string().min(1, "Nama wajib diisi"),
  whatsapp: z.string().min(6, "Nomor WhatsApp tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where: any = { deletedAt: null };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        whatsapp: true,
        role: true,
        isActive: true,
        createdAt: true,
        userTrips: {
          select: {
            roleOnTrip: true,
            trip: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.user.count({ where });

    return NextResponse.json({ ok: true, total, items });
  } catch (err: any) {
    console.error("GET /api/users error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Buat user baru khusus ADMIN (bukan peserta).
 * Body: { username, name, whatsapp, password }
 * role akan dipaksa jadi "ADMIN".
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = CreateUserSchema.parse(json);

    // Cek username sudah dipakai atau belum
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Username sudah digunakan" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const created = await prisma.user.create({
      data: {
        username: data.username,
        name: data.name,
        whatsapp: data.whatsapp,
        password: passwordHash,
        role: "ADMIN", // paksa hanya ADMIN
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: created.id,
        username: created.username,
        name: created.name,
        whatsapp: created.whatsapp,
        role: created.role,
        isActive: created.isActive,
        createdAt: created.createdAt,
      },
    });
  } catch (err: any) {
    console.error("POST /api/users error", err);
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
