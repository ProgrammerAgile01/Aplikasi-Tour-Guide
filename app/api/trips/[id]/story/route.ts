// app/api/trips/[id]/story/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

function formatDateRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };

  const startStr = start.toLocaleDateString("id-ID", opts);
  const endStr = end.toLocaleDateString("id-ID", opts);

  return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
}

function formatCheckedAt(dt: Date) {
  const d = dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const t = dt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${d}, ${t} WIB`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await ctx.params;
    const tripId = id;

    if (!tripId || tripId === "undefined") {
      return NextResponse.json(
        { ok: false, message: "tripId kosong" },
        { status: 400 }
      );
    }

    const payload = getSessionFromRequest(req);
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // cari participantId dari payload.trips (hasil login)
    const tripOnUser = payload.trips?.find((t: any) => t.id === tripId);
    const participantId: string | null = tripOnUser?.participantId ?? null;

    if (!participantId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Anda tidak terdaftar sebagai peserta pada trip ini, story tidak tersedia",
        },
        { status: 403 }
      );
    }

    // ===== 1. semua attendance peserta di trip ini =====
    const attendances = await prisma.attendance.findMany({
      where: { tripId, participantId },
      include: { session: true },
      orderBy: { checkedAt: "asc" },
    });

    // ===== 2. semua foto gallery APPROVED peserta ini =====
    const galleries = await prisma.gallery.findMany({
      where: { tripId, participantId, status: "APPROVED" },
      orderBy: { createdAt: "asc" },
    });

    const galleryBySessionId = new Map<string, string>();
    for (const g of galleries) {
      if (!galleryBySessionId.has(g.sessionId)) {
        galleryBySessionId.set(g.sessionId, g.imageUrl);
      }
    }

    const moments = attendances.map((a) => {
      const s = a.session;
      const lat = s.locationLat ? s.locationLat.toString() : "";
      const lon = s.locationLon ? s.locationLon.toString() : "";
      const coordinates = lat && lon ? `${lat}, ${lon}` : "";

      const image =
        galleryBySessionId.get(a.sessionId) ?? "/placeholder-story-image.jpg";

      return {
        id: a.id,
        day: s.day,
        location: s.location,
        time: s.timeText,
        checkedInAt: formatCheckedAt(a.checkedAt),
        image,
        caption: s.title,
        coordinates,
      };
    });

    const uniqueSessionIds = new Set(attendances.map((a) => a.sessionId));
    const totalLocations = uniqueSessionIds.size;
    const totalPhotos = galleries.length;

    // ===== 3. HITUNG BADGE DARI TABEL ParticipantBadge =====
    const participantBadges = await prisma.participantBadge.findMany({
      where: {
        tripId,
        participantId,
      },
      // kalau nanti butuh tampilkan detail badge di UI, bisa include:
      // include: { badge: true },
    });

    const badgesEarned = participantBadges.length;

    const tripSummary = {
      title: trip.name,
      dates: formatDateRange(trip.startDate, trip.endDate),
      participant: payload.user?.name ?? "Peserta",
      totalLocations,
      totalPhotos,
      badgesEarned, // ✅ sekarang real dari badge, bukan rumus
    };

    return NextResponse.json({
      ok: true,
      data: {
        tripSummary,
        moments,
        // kalau mau, bisa kirim daftar badge juga:
        // badges: participantBadges.map(pb => ({
        //   id: pb.id,
        //   code: pb.badge.code,
        //   name: pb.badge.name,
        //   icon: pb.badge.icon,
        //   unlockedAt: pb.unlockedAt,
        // })),
      },
    });
  } catch (err: any) {
    console.error("GET /api/trips/[id]/story error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
