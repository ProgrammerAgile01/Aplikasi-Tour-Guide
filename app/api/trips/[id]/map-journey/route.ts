import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const AUTH_COOKIE_NAME = "token";

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
    username: string;
    role: string;
  };
  trips: TokenTrip[];
};

function extractTripIdFromUrl(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const i = segments.indexOf("trips");
  if (i === -1) return null;
  return segments[i + 1] || null;
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

// Bangun rute trip (semua titik jadwal) pakai OSRM
async function buildTripRoutePath(
  locations: { lat: number; lng: number }[]
): Promise<{ lat: number; lng: number }[]> {
  try {
    if (locations.length < 2) return [];

    const coords = locations
      .map((l) => `${l.lng},${l.lat}`) // OSRM: lng,lat
      .join(";");

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM trip route error");
    const data = await res.json();

    const routeCoords: { lat: number; lng: number }[] =
      data?.routes?.[0]?.geometry?.coordinates?.map((c: [number, number]) => ({
        lng: c[0],
        lat: c[1],
      })) || [];

    return routeCoords;
  } catch (e) {
    console.warn("Gagal hit OSRM untuk rute trip, fallback garis lurus:", e);
    // fallback: kalau OSRM error, tetap boleh gambar garis lurus
    return locations.map((l) => ({ lat: l.lat, lng: l.lng }));
  }
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

    // baca token dari cookie
    const cookieHeader = req.headers.get("cookie");
    const token = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

    let participantId: string | null = null;

    if (token) {
      try {
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET || "dev-secret"
        ) as TokenPayload;

        const tripMeta = payload.trips?.find((t) => t.id === tripId);
        if (tripMeta?.participantId) {
          participantId = tripMeta.participantId;
        }
      } catch (e) {
        console.warn("JWT invalid di map-journey:", e);
      }
    }

    // ambil trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, name: true },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // ambil semua schedule yang punya koordinat
    const schedules = await prisma.schedule.findMany({
      where: {
        tripId,
        locationLat: { not: null },
        locationLon: { not: null },
      },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
    });

    // attendance untuk peserta ini
    let attendedSessionIds = new Set<string>();
    if (participantId) {
      const attendances = await prisma.attendance.findMany({
        where: { tripId, participantId },
        select: { sessionId: true },
      });
      attendedSessionIds = new Set(attendances.map((a) => a.sessionId));
    }

    // locations untuk frontend
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
        type: "location" as const,
        description: s.description || s.location || "",
        locationText: s.location,
      };
    });

    // center
    let center = { lat: -8.55, lng: 119.5 };
    if (locations.length > 0) {
      const avgLat =
        locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const avgLng =
        locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
      center = { lat: avgLat, lng: avgLng };
    }

    // build trip route lewat OSRM
    const routePath = await buildTripRoutePath(
      locations.map((l) => ({ lat: l.lat, lng: l.lng }))
    );

    return NextResponse.json({
      ok: true,
      trip: { id: trip.id, name: trip.name },
      center,
      locations,
      routePath,
    });
  } catch (err) {
    console.error("GET /api/trips/[tripId]/map-journey error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat data peta" },
      { status: 500 }
    );
  }
}
