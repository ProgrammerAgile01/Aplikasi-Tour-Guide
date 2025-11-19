import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { checkBadgesAfterGalleryUpload } from "@/lib/badges";

export const runtime = "nodejs";

// helper untuk ambil id
async function resolveId(req: Request, params: any) {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p && (p.id ?? p["0"]);
    if (idFromParams) return idFromParams;
  } catch {}
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

// Helper: ubah Prisma data → bentuk UI
function toClient(g: any, currentParticipantId: string | null) {
  return {
    id: g.id,
    src: g.imageUrl,
    caption: g.note ?? "",
    uploadedBy: g.participant?.name ?? "Peserta",
    uploadedAt: g.createdAt.toISOString(),
    location: g.session?.location ?? "",
    status: g.status,
    isMine: g.participantId === currentParticipantId,
  };
}

// ========================================
// GET → ambil APPROVED + PENDING milik user
// ========================================
export async function GET(req: Request, { params }: { params: any }) {
  try {
    const tripId = await resolveId(req, params);
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const payload = getSessionFromRequest(req) as any;

    let currentParticipantId: string | null = null;

    if (payload?.trips) {
      const info = payload.trips.find((t: any) => t.id === tripId);
      currentParticipantId = info?.participantId ?? null;
    }

    // Foto APPROVED => publik
    const approved = await prisma.gallery.findMany({
      where: { tripId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { participant: true, session: true },
    });

    // Foto PENDING hanya milik user
    let minePending: any[] = [];
    if (currentParticipantId) {
      minePending = await prisma.gallery.findMany({
        where: {
          tripId,
          participantId: currentParticipantId,
          status: "PENDING",
        },
        include: { participant: true, session: true },
      });
    }

    // gabungkan & sort
    const merged = [...approved, ...minePending].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json({
      ok: true,
      data: merged.map((g) => toClient(g, currentParticipantId)),
    });
  } catch (e: any) {
    console.error("GET /gallery error:", e);
    return NextResponse.json(
      { ok: false, message: "Internal Error" },
      { status: 500 }
    );
  }
}

// ========================================
// POST → upload foto (status PENDING)
// ========================================
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

    const tripInfo = payload.trips?.find((t: any) => t.id === tripId);
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
    const note = (formData.get("note") as string) || "";
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "Gambar wajib diisi." },
        { status: 400 }
      );
    }
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, message: "SessionId tidak valid." },
        { status: 400 }
      );
    }

    // upload file
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "gallery");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, bytes);

    const imageUrl = `/uploads/gallery/${filename}`;

    // simpan ke DB → status PENDING
    const gallery = await prisma.gallery.create({
      data: {
        tripId,
        participantId,
        sessionId,
        note,
        imageUrl,
        status: "PENDING",
      },
      include: {
        participant: true,
        session: true,
      },
    });

    // badges
    const newlyUnlocked = await checkBadgesAfterGalleryUpload({
      tripId,
      sessionId,
      participantId,
    });

    return NextResponse.json({
      ok: true,
      message: "Foto terkirim — menunggu persetujuan admin.",
      image: toClient(gallery, participantId), // 🔹 frontend langsung pakai
      newBadges: newlyUnlocked.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
    });
  } catch (e: any) {
    console.error("POST /gallery error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
