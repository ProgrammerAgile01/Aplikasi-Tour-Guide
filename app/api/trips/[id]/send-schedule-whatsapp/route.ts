import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getWhatsAppTemplateContent,
  applyTemplate,
  WhatsAppTemplateType,
} from "@/lib/whatsapp-templates";

function formatIdDate(d: Date) {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Bangun teks untuk 1 jadwal saja (1 bubble)
function buildScheduleItemBlock(s: {
  id: string;
  day: number;
  dateText: string;
  timeText: string;
  category?: string | null;
  title: string;
  location: string;
  locationMapUrl?: string | null;
  hints?: string[] | null;
  description?: string | null;
  isChanged: boolean;
  isAdditional: boolean;
}) {
  const lines: string[] = [];

  // Header hari + tanggal
  lines.push(`🗓 Hari ${s.day}, ${s.dateText}`);
  lines.push("");

  // Flag perubahan/tambahan
  const flags: string[] = [];
  if (s.isChanged) flags.push("PERUBAHAN");
  if (s.isAdditional) flags.push("TAMBAHAN");
  const flagLabel = flags.length ? ` [${flags.join(" & ")}]` : "";

  // Judul & waktu
  lines.push(`⏰ ${s.timeText}${flagLabel} — ${s.title}`);
  lines.push(`📍 Lokasi: ${s.location}`);

  // Map (kalau ada)
  if (s.locationMapUrl) {
    lines.push(`🗺 Peta: ${s.locationMapUrl}`);
  }

  // Petunjuk
  if (s.hints && s.hints.length > 0) {
    lines.push("💡 Petunjuk:");
    for (const h of s.hints) {
      lines.push(` • ${h}`);
    }
  }

  // Deskripsi
  if (s.description) {
    lines.push(`ℹ️ ${s.description}`);
  }

  return lines.join("\n");
}

// POST /api/trips/[tripId]/send-schedule-whatsapp
export async function POST(req: Request, ctx: { params: { tripId?: string } }) {
  try {
    let tripId = ctx.params?.tripId;

    if (!tripId) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("trips");
      if (idx !== -1 && parts[idx + 1]) {
        tripId = parts[idx + 1];
      }
    }

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    const [participants, schedules] = await Promise.all([
      prisma.participant.findMany({
        where: { tripId },
      }),
      prisma.schedule.findMany({
        where: { tripId },
        orderBy: [{ day: "asc" }, { timeText: "asc" }],
      }),
    ]);

    if (participants.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Belum ada peserta di trip ini" },
        { status: 400 }
      );
    }

    if (schedules.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Belum ada jadwal untuk trip ini" },
        { status: 400 }
      );
    }

    const tripStart = formatIdDate(trip.startDate as Date);
    const tripEnd = formatIdDate(trip.endDate as Date);
    const dateRange = `${tripStart} s/d ${tripEnd}`;

    // PENTING: tetap pakai tipe template yang sama
    const templateType: WhatsAppTemplateType = "SCHEDULE";
    const { content: templateContent } = await getWhatsAppTemplateContent(
      tripId,
      templateType
    );

    // 1 peserta x N jadwal -> N pesan
    const messagesData = participants.flatMap((p) =>
      schedules.map((s) => {
        // SEKARANG: schedule_block = 1 jadwal (bukan semua)
        const scheduleBlock = buildScheduleItemBlock(s as any);

        const content = applyTemplate(templateContent, {
          participant_name: p.name,
          trip_name: trip.name,
          trip_location: trip.location ?? "",
          trip_date_range: dateRange,
          schedule_block: scheduleBlock,
        });

        return {
          tripId,
          participantId: p.id,
          to: p.whatsapp,
          // boleh tetap pakai nama template lama
          template: "TRIP_SCHEDULE_FULL",
          content,
          payload: {
            type: "TRIP_SCHEDULE_FULL",
            tripId,
            participantId: p.id,
            scheduleId: s.id,
          },
          status: "PENDING" as const,
        };
      })
    );

    await prisma.whatsAppMessage.createMany({
      data: messagesData,
    });

    return NextResponse.json({
      ok: true,
      message: "Jadwal diantrikan ke WhatsApp",
      participantCount: participants.length,
    });
  } catch (err: any) {
    console.error("Error enqueue WA schedule:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Gagal mengantrikan pesan WhatsApp",
      },
      { status: 500 }
    );
  }
}
