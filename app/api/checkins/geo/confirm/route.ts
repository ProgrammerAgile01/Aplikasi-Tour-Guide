import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";
import {
  checkBadgesAfterCheckin,
  checkBadgesAfterAttendanceSummary,
} from "@/lib/badges";
import { updateTripStatusIfAllCompleted } from "@/lib/trip-progress";

// default radius
const DEFAULT_ATTENDANCE_RADIUS_METERS = 200;

// Haversine formula untuk hitung jarak 2 titik lat/lon dalam meter
function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // radius bumi (meter)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["token"];
    const auth = verifyToken(sessionToken);

    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tripId, sessionId, lat, lon } = body as {
      tripId?: string;
      sessionId?: string;
      lat?: number;
      lon?: number;
    };

    if (
      !tripId ||
      !sessionId ||
      typeof lat !== "number" ||
      typeof lon !== "number"
    ) {
      return NextResponse.json(
        { ok: false, message: "tripId, sessionId, lat, lon required" },
        { status: 400 }
      );
    }

    const userId = String(auth.user?.id);

    // ambil setting global radius absensi GEO
    const setting = await prisma.setting.findUnique({
      where: { id: "GLOBAL_SETTING" },
      select: {
        geoAttendanceRadiusMeters: true,
      },
    });

    // fallback kalau belum diisi / null / 0
    const MAX_DISTANCE_METERS =
      setting?.geoAttendanceRadiusMeters &&
      setting.geoAttendanceRadiusMeters > 0
        ? setting.geoAttendanceRadiusMeters
        : DEFAULT_ATTENDANCE_RADIUS_METERS;

    // pastikan user terdaftar di trip
    const link = await prisma.userTrip.findFirst({ where: { userId, tripId } });
    if (!link) {
      return NextResponse.json(
        { ok: false, message: "Anda bukan peserta trip ini" },
        { status: 403 }
      );
    }

    // ambil schedule utk dapat koordinat target
    const schedule = await prisma.schedule.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        tripId: true,
        locationLat: true,
        locationLon: true,
        title: true,
      },
    });

    if (!schedule || schedule.tripId !== tripId) {
      return NextResponse.json(
        { ok: false, message: "Sesi tidak valid untuk trip ini" },
        { status: 400 }
      );
    }

    if (!schedule.locationLat || !schedule.locationLon) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Lokasi untuk sesi ini belum dikonfigurasi. Hubungi pemandu.",
        },
        { status: 400 }
      );
    }

    const targetLat = Number(schedule.locationLat);
    const targetLon = Number(schedule.locationLon);

    if (Number.isNaN(targetLat) || Number.isNaN(targetLon)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Koordinat lokasi sesi tidak valid. Hubungi admin/pemandu.",
        },
        { status: 500 }
      );
    }

    // hitung jarak dari user ke titik sesi
    const distance = distanceInMeters(lat, lon, targetLat, targetLon);

    if (distance > MAX_DISTANCE_METERS) {
      return NextResponse.json(
        {
          ok: false,
          message: `Lokasi Anda terlalu jauh dari titik check-in (≈${Math.round(
            distance
          )} m). Batas jarak: ${MAX_DISTANCE_METERS} m. Dekati lokasi dan coba lagi.`,
          data: { distance, maxDistance: MAX_DISTANCE_METERS },
        },
        { status: 400 }
      );
    }

    // temukan participant dari user (whatsapp / name)
    const user = await prisma.user.findUnique({ where: { id: userId } });

    let participant = await prisma.participant.findFirst({
      where: { tripId, whatsapp: user?.whatsapp ?? "" },
    });

    if (!participant) {
      participant = await prisma.participant.findFirst({
        where: { tripId, name: user?.name ?? "" },
      });
    }

    if (!participant) {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan di trip ini" },
        { status: 404 }
      );
    }

    // Upsert Attendance, method = GEO
    const att = await prisma.attendance.upsert({
      where: {
        participantId_sessionId: { participantId: participant.id, sessionId },
      },
      update: { method: "GEO" },
      create: {
        tripId,
        sessionId,
        participantId: participant.id,
        method: "GEO",
      },
    });

    // Update ringkas participant
    const now = new Date();
    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        totalCheckIns: { increment: 1 },
        lastCheckIn: `${now.toLocaleDateString(
          "id-ID"
        )} - ${now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      },
    });

    // CEK BADGE BARU
    const [checkinBadges, completeBadges] = await Promise.all([
      checkBadgesAfterCheckin({
        tripId,
        sessionId,
        participantId: participant.id,
      }),
      checkBadgesAfterAttendanceSummary({
        tripId,
        participantId: participant.id,
      }),
    ]);

    const allBadges = [...checkinBadges, ...completeBadges];
    const seen = new Set<string>();
    const uniqueBadges = allBadges.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    await updateTripStatusIfAllCompleted(tripId);

    return NextResponse.json({
      ok: true,
      data: {
        attendanceId: att.id,
        checkedAt: att.checkedAt,
        distance,
        method: "GEO",
      },
      newBadges: uniqueBadges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
