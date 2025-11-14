// app/api/galleries/upload/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "gallery");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || ".jpg";
    const safeExt =
      ext.length <= 6 && ext.match(/^\.[a-zA-Z0-9]+$/) ? ext : ".jpg";

    const filename =
      Date.now().toString() +
      "-" +
      Math.random().toString(16).slice(2) +
      safeExt;

    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    // URL publik (karena file di bawah /public)
    const url = `/uploads/gallery/${filename}`;

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("Upload gallery error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Gagal mengupload file" },
      { status: 500 }
    );
  }
}
