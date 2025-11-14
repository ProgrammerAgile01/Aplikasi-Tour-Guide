// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { getSessionFromRequest } from "@/lib/auth"; // sudah kamu buat sebelumnya

// type SessionPayload = {
//   user?: { id: string; role: string };
//   trips?: Array<{ id: string; name: string; roleOnTrip?: string }>;
// };

// export async function GET(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const payload = getSessionFromRequest(req) as SessionPayload | null;
//     if (!payload) {
//       return NextResponse.json(
//         { ok: false, message: "Not authenticated" },
//         { status: 401 }
//       );
//     }

//     const role = String(payload.user?.role ?? "").toUpperCase();
//     const tripId = decodeURIComponent(params.id); // aman kalau ada karakter khusus

//     if (role !== "ADMIN") {
//       const ownsTrip = (payload.trips ?? []).some((t) => t.id === tripId);
//       if (!ownsTrip) {
//         return NextResponse.json(
//           { ok: false, message: "Forbidden" },
//           { status: 403 }
//         );
//       }
//     }

//     // Ambil data trip + schedules + participants + announcements
//     const trip = await prisma.trip.findUnique({
//       where: { id: tripId },
//       include: {
//         schedules: {
//           orderBy: [{ day: "asc" }, { timeText: "asc" }],
//           // kalau mau hanya jadwal >= today, ubah filter di sini
//         },
//         participants: true,
//         announcements: {
//           orderBy: { createdAt: "desc" },
//           take: 5,
//         },
//       },
//     });

//     if (!trip) {
//       return NextResponse.json(
//         { ok: false, message: "Trip tidak ditemukan" },
//         { status: 404 }
//       );
//     }

//     // Cari "agenda berikutnya" sederhana: pakai schedule paling awal
//     const next = trip.schedules[0] ?? null;

//     const nextAgenda = next
//       ? {
//           id: next.id,
//           title: next.title,
//           time: next.timeText,
//           date: next.dateText,
//           // skema kamu belum punya lat/lon; kalau nanti ditambah, isi di sini
//           // atau parsing dari locationMapUrl bila ada format query=lat,lon
//           location: undefined as
//             | { lat: string | number; lng: string | number }
//             | undefined,
//         }
//       : undefined;

//     const data = {
//       id: trip.id,
//       title: trip.name,
//       subtitle: trip.description,
//       nextAgenda,
//       todaysSummary: {
//         sessions: trip.schedules.length,
//         completed: 0, // jika ada status per schedule, bisa dihitung beneran
//         participants: trip.participants.length,
//         duration: "—", // isi sesuai logika kamu kalau ada total durasi
//       },
//       announcements: trip.announcements.map((a) => ({
//         id: a.id,
//         text: a.content,
//       })),
//     };

//     return NextResponse.json({ ok: true, data });
//   } catch (err: any) {
//     console.error("GET /api/trips/[id]/overview error:", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { getSessionFromRequest } from "@/lib/auth";

// /**
//  * Robust resolver untuk mengambil tripId dari params (Promise atau plain object)
//  * atau fallback parsing dari URL.
//  */
// async function resolveTripId(
//   req: Request,
//   params: any
// ): Promise<string | undefined> {
//   try {
//     let p = params;
//     if (p && typeof p.then === "function") p = await p; // unwrap promise if given
//     // Try common param shapes: { id } or catch-all param ["0"]
//     const idFromParams = p?.id ?? p?.["0"] ?? p?.tripId;
//     if (idFromParams) return decodeURIComponent(String(idFromParams));
//   } catch {
//     // ignore and fallback to URL parsing
//   }

//   // Fallback: parse dari URL, contoh: /api/trips/:id/overview
//   try {
//     const pathname = new URL(req.url).pathname;
//     const parts = pathname.split("/").filter(Boolean);
//     // cari segmen "trips" lalu ambil segmen selanjutnya
//     const i = parts.findIndex((x) => x === "trips");
//     const id = i >= 0 ? parts[i + 1] : parts[parts.length - 2];
//     return id ? decodeURIComponent(id) : undefined;
//   } catch {
//     return undefined;
//   }
// }

// type SessionPayload = {
//   user?: { id: string; role: string };
//   trips?: Array<{ id: string; name?: string; roleOnTrip?: string }>;
// };

// /**
//  * GET /api/trips/[id]/overview
//  */
// export async function GET(req: Request, ctx: { params: any }) {
//   try {
//     // ambil session dari request (implementasi ada di lib/auth)
//     const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
//     if (!payload) {
//       return NextResponse.json(
//         { ok: false, message: "Not authenticated" },
//         { status: 401 }
//       );
//     }

//     const role = String(payload.user?.role ?? "").toUpperCase();
//     const tripId = await resolveTripId(req, ctx.params);

//     if (!tripId) {
//       return NextResponse.json(
//         { ok: false, message: "Bad Request: tripId missing" },
//         { status: 400 }
//       );
//     }

//     // Non-admin hanya boleh akses trip yang ada di token/session
//     if (role !== "ADMIN") {
//       const ownsTrip = (payload.trips ?? []).some((t) => t.id === tripId);
//       if (!ownsTrip) {
//         return NextResponse.json(
//           { ok: false, message: "Forbidden" },
//           { status: 403 }
//         );
//       }
//     }

//     // Ambil trip; include schedules, participants, announcements (dengan sorting)
//     const trip = await prisma.trip.findUnique({
//       where: { id: tripId },
//       include: {
//         schedules: {
//           orderBy: [{ day: "asc" }, { timeText: "asc" }],
//         },
//         participants: true,
//         announcements: {
//           // Urutan: IMPORTANT dulu (enum descending), lalu pinned dulu, lalu createdAt terbaru
//           orderBy: [
//             { priority: "desc" }, // IMPORTANT sebelum NORMAL (tergantung deklarasi enum di schema)
//             { isPinned: "desc" }, // pinned true dulu
//             { createdAt: "desc" }, // terbaru dulu
//           ],
//           // ambil maksimum 20 pengumuman; sesuaikan jika perlu
//           take: 20,
//         },
//       },
//     });

//     if (!trip) {
//       return NextResponse.json(
//         { ok: false, message: "Trip tidak ditemukan" },
//         { status: 404 }
//       );
//     }

//     // Next agenda: ambil yang paling awal dari list jadwal (sudah ter-order)
//     const next = trip.schedules?.[0];

//     const data = {
//       id: trip.id,
//       title: trip.name,
//       subtitle: trip.description ?? undefined,
//       // nextAgenda kalau tersedia
//       nextAgenda: next
//         ? {
//             id: next.id,
//             title: next.title,
//             time: next.timeText,
//             date: next.dateText,
//             // uncomment bila schema menyimpan koordinat
//             // location: next.locationLat && next.locationLon ? { lat: String(next.locationLat), lng: String(next.locationLon) } : undefined,
//           }
//         : undefined,
//       todaysSummary: {
//         sessions: Array.isArray(trip.schedules) ? trip.schedules.length : 0,
//         completed: 0, // placeholder — update jika punya status per schedule
//         participants: Array.isArray(trip.participants)
//           ? trip.participants.length
//           : 0,
//         duration: "—",
//       },
//       // Kembalikan title + content + meta pengumuman (sudah terurut)
//       announcements: (trip.announcements ?? []).map((a) => ({
//         id: a.id,
//         title: a.title,
//         content: a.content,
//         priority: a.priority,
//         isPinned: a.isPinned,
//         createdAt: a.createdAt,
//       })),
//     };

//     return NextResponse.json({ ok: true, data });
//   } catch (err: any) {
//     console.error("GET /api/trips/[id]/overview error:", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * Robust resolver untuk ambil tripId dari params atau URL
 */
async function resolveTripId(
  req: Request,
  params: any
): Promise<string | undefined> {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p?.id ?? p?.["0"] ?? p?.tripId;
    if (idFromParams) return decodeURIComponent(String(idFromParams));
  } catch {
    // ignore
  }

  try {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const i = parts.findIndex((x) => x === "trips");
    const id = i >= 0 ? parts[i + 1] : parts[parts.length - 2];
    return id ? decodeURIComponent(id) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * NB: sekarang trips di token punya participantId
 *  {
 *    id, name, roleOnTrip, participantId
 *  }
 */
type SessionPayload = {
  user?: { id: string; role: string };
  trips?: Array<{
    id: string;
    name?: string;
    roleOnTrip?: string;
    participantId?: string | null;
  }>;
};

// helper Decimal -> number
const toNum = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "object" && typeof v.toNumber === "function") {
    return v.toNumber();
  }
  return Number(v);
};

/**
 * GET /api/trips/[id]/overview
 */
export async function GET(req: Request, ctx: { params: any }) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;

    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    const tripId = await resolveTripId(req, ctx.params);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Bad Request: tripId missing" },
        { status: 400 }
      );
    }

    // pastikan user memang punya trip ini (kecuali ADMIN)
    const tripMeta = (payload.trips ?? []).find((t) => t.id === tripId);
    if (role !== "ADMIN" && !tripMeta) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const participantId = tripMeta?.participantId ?? null;

    // ambil trip + jadwal + peserta + pengumuman
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { timeText: "asc" }],
        },
        participants: true,
        announcements: {
          orderBy: [
            { priority: "desc" },
            { isPinned: "desc" },
            { createdAt: "desc" },
          ],
          take: 20,
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // ==== NEXT AGENDA BERDASARKAN ABSENSI PESERTA ====
    let attendedSet: Set<string> | null = null;

    if (participantId) {
      const attendances = await prisma.attendance.findMany({
        where: {
          tripId,
          participantId,
        },
        select: { sessionId: true },
      });
      attendedSet = new Set(attendances.map((a) => a.sessionId));
    }

    let next = undefined as (typeof trip.schedules)[number] | undefined;

    if (attendedSet) {
      // pilih jadwal pertama yang BELUM di-absen sama peserta ini
      next = trip.schedules.find((s) => !attendedSet!.has(s.id));
    } else {
      // fallback: kalau tidak ada participantId di token, pakai jadwal pertama
      next = trip.schedules[0];
    }

    const completedCount = attendedSet
      ? trip.schedules.filter((s) => attendedSet!.has(s.id)).length
      : 0;

    const data = {
      id: trip.id,
      title: trip.name,
      subtitle: trip.description ?? undefined,
      nextAgenda: next
        ? {
            id: next.id,
            title: next.title,
            time: next.timeText,
            date: next.dateText,
            locationName: next.location,
            locationLat: toNum(next.locationLat),
            locationLon: toNum(next.locationLon),
          }
        : undefined,
      todaysSummary: {
        sessions: Array.isArray(trip.schedules) ? trip.schedules.length : 0,
        completed: completedCount, // jumlah sesi yang sudah di-checkin peserta ini
        participants: Array.isArray(trip.participants)
          ? trip.participants.length
          : 0,
        duration: "—",
      },
      announcements: (trip.announcements ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        isPinned: a.isPinned,
        createdAt: a.createdAt,
      })),
    };

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/trips/[id]/overview error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
