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

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// Robust resolver: handle params as Promise or plain object; fallback parse from URL
async function resolveTripId(
  req: Request,
  params: any
): Promise<string | undefined> {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p; // unwrap if it's a Promise
    const idFromParams = p?.id ?? p?.["0"];
    if (idFromParams) return decodeURIComponent(idFromParams as string);
  } catch {
    // ignore and fallback
  }

  // Fallback: parse from URL -> /api/trips/:id/overview
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  // find segment after "trips"
  const i = parts.findIndex((x) => x === "trips");
  const id = i >= 0 ? parts[i + 1] : parts[parts.length - 2]; // safe guess
  return id ? decodeURIComponent(id) : undefined;
}

type SessionPayload = {
  user?: { id: string; role: string };
  trips?: Array<{ id: string; name: string; roleOnTrip?: string }>;
};

export async function GET(req: Request, ctx: { params: any }) {
  try {
    const payload = getSessionFromRequest(req) as SessionPayload | null;
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

    // Non-admin hanya boleh akses trip yang ada di token
    if (role !== "ADMIN") {
      const ownsTrip = (payload.trips ?? []).some((t) => t.id === tripId);
      if (!ownsTrip) {
        return NextResponse.json(
          { ok: false, message: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Ambil data
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { timeText: "asc" }],
        },
        participants: true,
        announcements: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cari agenda berikutnya versi simple (ambil paling awal)
    const next = trip.schedules[0];

    const data = {
      id: trip.id,
      title: trip.name,
      subtitle: trip.description,
      nextAgenda: next
        ? {
            id: next.id,
            title: next.title,
            time: next.timeText,
            date: next.dateText,
            // tambahkan lat/lon kalau sudah ada di schema
            // location: { lat: String(next.locationLat), lng: String(next.locationLon) }
          }
        : undefined,
      todaysSummary: {
        sessions: trip.schedules.length,
        completed: 0, // update jika ada status per schedule
        participants: trip.participants.length,
        duration: "—",
      },
      announcements: trip.announcements.map((a) => ({
        id: a.id,
        text: a.content,
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
