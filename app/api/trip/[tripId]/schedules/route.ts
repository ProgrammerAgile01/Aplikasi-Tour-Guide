// app/api/trip/[tripId]/schedules/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function toNumberOrNull(v: any) {
  if (v === null || v === undefined) return null;
  const n = Number(v?.toString?.() ?? v);
  return Number.isFinite(n) ? n : null;
}

function toHintsArray(v: unknown): string[] | null {
  if (v == null) return null;

  // Kalau sudah array -> pastikan string[]
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : (x as any)?.toString?.() ?? ""))
      .filter(Boolean);
  }

  // Kalau string berisi JSON -> coba parse
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) =>
            typeof x === "string" ? x : (x as any)?.toString?.() ?? ""
          )
          .filter(Boolean);
      }
    } catch {
      // biarkan null kalau bukan JSON array
    }
  }

  // Kalau object JSON Prisma -> coba ambil nilai2 string di dalamnya
  if (typeof v === "object") {
    const anyObj = v as any;
    if (Array.isArray(anyObj)) {
      return anyObj
        .map((x: any) => (typeof x === "string" ? x : x?.toString?.() ?? ""))
        .filter(Boolean);
    }
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;

    const rows = await prisma.schedule.findMany({
      where: { tripId },
      orderBy: [{ day: "asc" }, { timeText: "asc" }],
    });

    type DayPayload = {
      day: number;
      date: string;
      dateValueISO?: string;
      sessions: Array<{
        id: string;
        time: string;
        title: string;
        category?: string | null;
        location?: string | null;
        locationMapUrl?: string | null;
        lat?: number | null;
        lon?: number | null;
        description?: string | null;
        hints?: string[] | null;
        isChanged?: boolean;
        isAdditional?: boolean;
      }>;
    };

    const mapByDay: Record<number, DayPayload> = {};

    for (const r of rows) {
      const d = r.day;
      if (!mapByDay[d]) {
        // parse dateText -> ISO (best effort)
        let iso: string | undefined;
        const parsed = Date.parse(
          r.dateText?.replace?.(/(\d{1,2}) (\w+) (\d{4})/, "$1 $2 $3") ||
            r.dateText
        );
        if (!Number.isNaN(parsed)) iso = new Date(parsed).toISOString();

        mapByDay[d] = {
          day: d,
          date: r.dateText,
          dateValueISO: iso,
          sessions: [],
        };
      }

      mapByDay[d].sessions.push({
        id: r.id,
        time: r.timeText,
        title: r.title,
        category: r.category ?? null,
        location: r.location ?? null,
        locationMapUrl: r.locationMapUrl ?? null,
        lat: toNumberOrNull(r.locationLat),
        lon: toNumberOrNull(r.locationLon),
        description: r.description ?? null, // ✅ KIRIM DESKRIPSI
        hints: toHintsArray(r.hints), // ✅ KIRIM PETUNJUK (array string)
        isChanged: r.isChanged ?? false,
        isAdditional: r.isAdditional ?? false,
      });
    }

    const days = Object.values(mapByDay).sort((a, b) => a.day - b.day);
    return NextResponse.json({ ok: true, data: days });
  } catch (err: any) {
    console.error("GET /api/trip/[tripId]/schedules error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
