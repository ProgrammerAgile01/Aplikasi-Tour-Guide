import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req) as any;

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Tidak terautentikasi" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, message: "Harap isi semua field" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, message: "Konfirmasi password tidak sama" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, message: "Password baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { ok: false, message: "Password lama tidak sesuai" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({
      ok: true,
      message: "Password berhasil diubah",
    });
  } catch (err: any) {
    console.error("POST /api/me/password error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
