import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const AUTH_COOKIE_NAME = "token";

// Ambil tripId dari URL path: /api/trips/<tripId>/map-journey
function extractTripIdFromUrl(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  // contoh: ["api","trips","komodo-2025","map-journey"]
  const i = segments.indexOf("trips");
  if (i === -1) return null;
  return segments[i + 1] || null;
}

// payload token (minimal)
type TokenTrip = {
  id: string;
  name: string;
  roleOnTrip?: string | null;
  participantId?: string | null;
};

type TokenPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  trips: TokenTrip[];
};

function mapCategoryToType(
  category?: string | null
): "airport" | "island" | "beach" | "port" {
  if (!category) return "island";
  const c = category.toLowerCase();
  if (c.includes("bandara") || c.includes("airport")) return "airport";
  if (c.includes("pelabuhan") || c.includes("harbor") || c.includes("port"))
    return "port";
  if (c.includes("beach") || c.includes("pantai")) return "beach";
  return "island";
}

function getCookieValue(cookies: string | null, name: string): string | null {
  if (!cookies) return null;
  const parts = cookies.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tripId = extractTripIdFromUrl(url.pathname);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId kosong (gagal baca dari URL)" },
        { status: 400 }
      );
    }

    // 1️⃣ Baca token dari cookie
    const cookieHeader = req.headers.get("cookie");
    const token = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

    let participantId: string | null = null;

    if (token) {
      try {
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET || "dev-secret"
        ) as TokenPayload;

        // cari trip yg sama dengan tripId dari URL
        const tripMeta = payload.trips?.find((t) => t.id === tripId);
        if (tripMeta?.participantId) {
          participantId = tripMeta.participantId;
        }
      } catch (e) {
        console.warn("JWT invalid di map-journey:", e);
      }
    }

    // 2️⃣ Ambil trip (untuk judul)
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3️⃣ Ambil semua schedule yang punya koordinat
    const schedules = await prisma.schedule.findMany({
      where: {
        tripId,
        locationLat: { not: null },
        locationLon: { not: null },
      },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
    });

    // 4️⃣ Ambil attendance untuk peserta ini (kalau ada participantId)
    let attendedSessionIds = new Set<string>();
    if (participantId) {
      const attendances = await prisma.attendance.findMany({
        where: {
          tripId,
          participantId,
        },
        select: { sessionId: true },
      });
      attendedSessionIds = new Set(attendances.map((a) => a.sessionId));
    }

    // 5️⃣ Map ke locations
    const locations = schedules.map((s) => {
      const lat = (s.locationLat as any)?.toNumber
        ? (s.locationLat as any).toNumber()
        : Number(s.locationLat);
      const lng = (s.locationLon as any)?.toNumber
        ? (s.locationLon as any).toNumber()
        : Number(s.locationLon);

      return {
        id: s.id,
        name: s.title,
        lat,
        lng,
        day: s.day,
        time: s.timeText,
        visited: participantId ? attendedSessionIds.has(s.id) : false,
        type: mapCategoryToType(s.category),
        description: s.description || s.location || "",
        locationText: s.location,
      };
    });

    // 6️⃣ Hitung center (rata-rata koordinat)
    let center = { lat: -8.55, lng: 119.5 }; // fallback Komodo area
    if (locations.length > 0) {
      const avgLat =
        locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const avgLng =
        locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
      center = { lat: avgLat, lng: avgLng };
    }

    return NextResponse.json({
      ok: true,
      trip: {
        id: trip.id,
        name: trip.name,
      },
      center,
      locations,
    });
  } catch (err) {
    console.error("GET /api/trips/[tripId]/map-journey error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat data peta" },
      { status: 500 }
    );
  }
}
