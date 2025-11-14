import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

const GLOBAL_SETTING_ID = "GLOBAL_SETTING";

const TextSchema = z.object({
  tripName: z.string().trim().min(1, "Nama trip wajib diisi").max(191),
  description: z.string().trim().min(1, "Deskripsi wajib diisi"),
});

// GET: ambil setting global
export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { id: GLOBAL_SETTING_ID },
  });

  return NextResponse.json({
    ok: true,
    data: {
      logoUrl: setting?.logoUrl ?? null, // path lokal, misal "/uploads/app-logo-123.png"
      tripName: setting?.tripName ?? "",
      description: setting?.description ?? "",
    },
  });
}

// POST: terima multipart/form-data (logo image + text)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const tripName = (formData.get("tripName") ?? "").toString();
    const description = (formData.get("description") ?? "").toString();
    const logoFile = formData.get("logo") as File | null;

    // validasi text
    const parsed = TextSchema.safeParse({ tripName, description });
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validasi gagal",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // baca setting lama dulu (untuk keep logo lama kalau nggak upload baru)
    const existing = await prisma.setting.findUnique({
      where: { id: GLOBAL_SETTING_ID },
    });

    let logoUrl = existing?.logoUrl ?? null;

    // kalau ada file baru, simpan ke /public/uploads
    if (logoFile && logoFile.size > 0) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];

      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          {
            ok: false,
            message: "Tipe file tidak didukung. Gunakan PNG/JPG/WEBP.",
          },
          { status: 400 }
        );
      }

      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const ext =
        logoFile.type === "image/png"
          ? ".png"
          : logoFile.type === "image/webp"
          ? ".webp"
          : ".jpg";

      const fileName = `app-logo-${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, buffer);

      // path yang dipakai di front-end (public/)
      logoUrl = `/uploads/${fileName}`;
    }

    const setting = await prisma.setting.upsert({
      where: { id: GLOBAL_SETTING_ID },
      create: {
        id: GLOBAL_SETTING_ID,
        logoUrl,
        tripName,
        description,
      },
      update: {
        logoUrl,
        tripName,
        description,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Setting berhasil disimpan",
      data: {
        logoUrl: setting.logoUrl,
        tripName: setting.tripName,
        description: setting.description,
      },
    });
  } catch (err) {
    console.error("Error saving settings:", err);
    return NextResponse.json(
      { ok: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
