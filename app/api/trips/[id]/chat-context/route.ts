import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function extractTripIdFromUrl(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const i = segments.indexOf("trips");
  if (i === -1) return null;
  return segments[i + 1] || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tripId = extractTripIdFromUrl(url.pathname);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId kosong" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        schedules: {
          orderBy: [{ day: "asc" }, { timeText: "asc" }],
        },
      },
    });

    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // Group jadwal per hari
    const grouped: Record<
      number,
      {
        day: number;
        date: string;
        sessions: {
          time: string;
          title: string;
          location?: string | null;
        }[];
      }
    > = {};

    for (const s of trip.schedules) {
      if (!grouped[s.day]) {
        grouped[s.day] = {
          day: s.day,
          date: s.dateText,
          sessions: [],
        };
      }

      grouped[s.day].sessions.push({
        time: s.timeText,
        title: s.title,
        location: s.location,
      });
    }

    const schedule = Object.values(grouped).sort((a, b) => a.day - b.day);

    return NextResponse.json({
      ok: true,
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        location: trip.location,
      },
      schedule,
    });
  } catch (err: any) {
    console.error("GET /api/trips/[tripId]/chat-context error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
