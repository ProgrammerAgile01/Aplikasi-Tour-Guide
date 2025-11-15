// // app/api/trips/[tripId]/gallery/route.ts
// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { getSessionFromRequest } from "@/lib/auth";
// import { randomUUID } from "crypto";
// import fs from "fs/promises";
// import path from "path";

// export const runtime = "nodejs";

// function extractTripIdFromUrl(pathname: string): string | null {
//   const segments = pathname.split("/").filter(Boolean);
//   const i = segments.indexOf("trips");
//   if (i === -1) return null;
//   return segments[i + 1] || null;
// }

// // GET: list gallery APPROVED untuk trip
// export async function GET(
//   req: Request,
//   { params }: { params: { tripId: string } }
// ) {
//   try {
//     const tripId = params.tripId;

//     const galleries = await prisma.gallery.findMany({
//       where: {
//         tripId,
//         status: "APPROVED",
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//       include: {
//         participant: true,
//         session: true,
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       data: galleries.map((g) => ({
//         id: g.id,
//         src: g.imageUrl,
//         caption: g.note ?? "",
//         uploadedBy: g.participant?.name ?? "Peserta",
//         uploadedAt: g.createdAt,
//         location: g.session?.location ?? "",
//       })),
//     });
//   } catch (err: any) {
//     console.error("GET /api/trips/[tripId]/gallery error:", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal error" },
//       { status: 500 }
//     );
//   }
// }

// // POST: upload foto → status PENDING
// export async function POST(
//   req: Request,
//   { params }: { params: { tripId: string } }
// ) {
//   try {
//     const tripId = params.tripId;

//     const payload = getSessionFromRequest(req) as any;
//     if (!payload) {
//       return NextResponse.json(
//         { ok: false, message: "Not authenticated" },
//         { status: 401 }
//       );
//     }

//     // ✔ Ambil participantId dari token berdasarkan trip
//     const tripInfo = payload.trips?.find((t: any) => t.id === tripId);
//     if (!tripInfo || !tripInfo.participantId) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message: "Anda tidak terdaftar sebagai peserta trip ini.",
//         },
//         { status: 403 }
//       );
//     }

//     const participantId = tripInfo.participantId;

//     const formData = await req.formData();
//     const file = formData.get("image") as File | null;
//     const note = (formData.get("note") as string | null) ?? "";
//     const sessionId = formData.get("sessionId") as string | null;

//     if (!file) {
//       return NextResponse.json(
//         { ok: false, message: "Gambar wajib diisi." },
//         { status: 400 }
//       );
//     }

//     if (!sessionId || sessionId.trim() === "") {
//       return NextResponse.json(
//         {
//           ok: false,
//           message:
//             "Session belum dipilih. Silakan pilih jadwal untuk foto ini.",
//         },
//         { status: 400 }
//       );
//     }

//     // simpan file fisik
//     const bytes = Buffer.from(await file.arrayBuffer());
//     const uploadDir = path.join(process.cwd(), "public", "uploads", "gallery");
//     await fs.mkdir(uploadDir, { recursive: true });

//     const ext = file.name.split(".").pop() || "jpg";
//     const filename = `${randomUUID()}.${ext}`;
//     const filepath = path.join(uploadDir, filename);
//     await fs.writeFile(filepath, bytes);

//     const imageUrl = `/uploads/gallery/${filename}`;

//     const gallery = await prisma.gallery.create({
//       data: {
//         tripId,
//         participantId,
//         sessionId,
//         note,
//         imageUrl,
//         status: "PENDING", // tetap menunggu approval admin
//       },
//     });

//     return NextResponse.json({
//       ok: true,
//       message: "Foto terkirim — menunggu persetujuan admin.",
//       data: gallery,
//     });
//   } catch (err: any) {
//     console.error("POST /api/trips/[tripId]/gallery error:", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/trips/[id]/gallery/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function resolveId(req: Request, params: any) {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p && (p.id ?? p["0"]);
    if (idFromParams) return idFromParams;
  } catch {}
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 2]; // .../trips/[id]/gallery
}

// GET: gallery APPROVED (buat live feed)
export async function GET(req: Request, { params }: { params: any }) {
  try {
    const tripId = await resolveId(req, params);
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const galleries = await prisma.gallery.findMany({
      where: {
        tripId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
      include: {
        participant: true,
        session: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: galleries.map((g) => ({
        id: g.id,
        src: g.imageUrl,
        caption: g.note ?? "",
        uploadedBy: g.participant?.name ?? "Peserta",
        uploadedAt: g.createdAt.toISOString(),
        location: g.session?.location ?? "",
      })),
    });
  } catch (e: any) {
    console.error("GET /api/trips/[id]/gallery error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

// POST: upload foto → status PENDING
export async function POST(req: Request, { params }: { params: any }) {
  try {
    const tripId = await resolveId(req, params);
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // cek apakah user ini peserta trip ini (pakai data dari token)
    const tripInfo = Array.isArray(payload.trips)
      ? payload.trips.find((t: any) => t.id === tripId)
      : null;

    if (!tripInfo || !tripInfo.participantId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Anda tidak terdaftar sebagai peserta trip ini.",
        },
        { status: 403 }
      );
    }

    const participantId = tripInfo.participantId;

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const note = (formData.get("note") as string | null) ?? "";
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "Gambar wajib diisi." },
        { status: 400 }
      );
    }

    if (!sessionId || sessionId.trim() === "") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Session belum dipilih. Silakan pilih jadwal untuk foto ini.",
        },
        { status: 400 }
      );
    }

    // simpan file ke public/uploads/gallery
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "gallery");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, bytes);

    const imageUrl = `/uploads/gallery/${filename}`;

    // simpan ke database
    const gallery = await prisma.gallery.create({
      data: {
        tripId,
        participantId,
        sessionId,
        note,
        imageUrl,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Foto terkirim — menunggu persetujuan admin.",
      data: gallery,
    });
  } catch (e: any) {
    console.error("POST /api/trips/[id]/gallery error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
