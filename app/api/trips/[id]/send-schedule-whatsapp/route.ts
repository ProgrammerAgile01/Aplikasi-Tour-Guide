// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";

// function formatIdDate(d: Date) {
//   return d.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// }

// function buildScheduleMessage(opts: {
//   trip: any;
//   participant: any;
//   schedules: {
//     id: string;
//     day: number;
//     dateText: string;
//     timeText: string;
//     category?: string | null;
//     title: string;
//     location: string;
//     locationMapUrl?: string | null;
//     hints?: string[] | null;
//     description?: string | null;
//     isChanged: boolean;
//     isAdditional: boolean;
//   }[];
// }) {
//   const { trip, participant, schedules } = opts;

//   const tripStart = formatIdDate(trip.startDate as Date);
//   const tripEnd = formatIdDate(trip.endDate as Date);

//   const byDay: Record<number, typeof schedules> = {};
//   for (const s of schedules) {
//     if (!byDay[s.day]) byDay[s.day] = [];
//     byDay[s.day].push(s);
//   }

//   const lines: string[] = [];

//   lines.push(`Halo ${participant.name}! 👋`);
//   lines.push("");
//   lines.push(`Berikut jadwal lengkap untuk trip "${trip.name}".`);
//   lines.push("");
//   lines.push(`Periode: ${tripStart} s/d ${tripEnd}`);
//   lines.push(`Lokasi: ${trip.location}`);
//   lines.push("");

//   const sortedDays = Object.keys(byDay)
//     .map((d) => Number(d))
//     .sort((a, b) => a - b);

//   for (const day of sortedDays) {
//     const daySchedules = byDay[day].sort((a, b) =>
//       a.timeText.localeCompare(b.timeText)
//     );
//     const dateText = daySchedules[0]?.dateText || "";

//     lines.push(`🗓 Hari ${day}, ${dateText}`);
//     lines.push("");

//     for (const s of daySchedules) {
//       const flags: string[] = [];
//       if (s.isChanged) flags.push("PERUBAHAN");
//       if (s.isAdditional) flags.push("TAMBAHAN");

//       const flagLabel = flags.length ? ` [${flags.join(" & ")}]` : "";

//       lines.push(
//         `⏰ ${s.timeText}${flagLabel} — ${s.title}`
//       );
//       lines.push(`📍 Lokasi: ${s.location}`);

//       if (s.locationMapUrl) {
//         lines.push(`🗺 Peta: ${s.locationMapUrl}`);
//       }

//       if (s.hints && (s.hints as string[]).length > 0) {
//         lines.push("💡 Petunjuk:");
//         for (const h of s.hints as string[]) {
//           lines.push(` • ${h}`);
//         }
//       }

//       if (s.description) {
//         lines.push(`ℹ️ ${s.description}`);
//       }

//       lines.push("");
//     }

//     lines.push("");
//   }

//   lines.push(
//     "Jika ada perubahan jadwal penting, kami akan menginformasikan kembali melalui WhatsApp. 🙏"
//   );
//   lines.push("");
//   lines.push("Terima kasih,");
//   lines.push("Tim Tour Guide");

//   return lines.join("\n");
// }

// // Pakai ctx.params biasa + fallback URL.
// export async function POST(req: Request, ctx: { params: { tripId?: string } }) {
//   try {
//     // 1) Ambil dari ctx.params
//     let tripId = ctx.params?.tripId;

//     // 2) Fallback: parse dari URL (kalau entah kenapa params kosong)
//     if (!tripId) {
//       const url = new URL(req.url);
//       const parts = url.pathname.split("/").filter(Boolean);
//       // ex: ["api", "trips", "trip-labuan-bajo", "send-schedule-whatsapp"]
//       const idx = parts.indexOf("trips");
//       if (idx !== -1 && parts[idx + 1]) {
//         tripId = parts[idx + 1];
//       }
//     }

//     console.log(
//       "[send-schedule-whatsapp] tripId resolved =",
//       tripId,
//       "raw params =",
//       ctx.params
//     );

//     if (!tripId) {
//       return NextResponse.json(
//         { ok: false, message: "tripId wajib diisi" },
//         { status: 400 }
//       );
//     }

//     const trip = await prisma.trip.findUnique({
//       where: { id: tripId },
//     });

//     if (!trip) {
//       return NextResponse.json(
//         { ok: false, message: "Trip tidak ditemukan" },
//         { status: 404 }
//       );
//     }

//     const [participants, schedules] = await Promise.all([
//       prisma.participant.findMany({
//         where: { tripId },
//       }),
//       prisma.schedule.findMany({
//         where: { tripId },
//         orderBy: [{ day: "asc" }, { timeText: "asc" }],
//       }),
//     ]);

//     if (participants.length === 0) {
//       return NextResponse.json(
//         { ok: false, message: "Belum ada peserta di trip ini" },
//         { status: 400 }
//       );
//     }

//     if (schedules.length === 0) {
//       return NextResponse.json(
//         { ok: false, message: "Belum ada jadwal untuk trip ini" },
//         { status: 400 }
//       );
//     }

//     const messagesData = participants.map((p) => {
//       const content = buildScheduleMessage({
//         trip,
//         participant: p,
//         schedules,
//       });

//       return {
//         tripId,
//         participantId: p.id,
//         to: p.whatsapp,
//         template: "TRIP_SCHEDULE_FULL",
//         content,
//         payload: {
//           type: "TRIP_SCHEDULE_FULL",
//           tripId,
//           participantId: p.id,
//         },
//         status: "PENDING" as const,
//       };
//     });

//     await prisma.whatsAppMessage.createMany({
//       data: messagesData,
//     });

//     return NextResponse.json({
//       ok: true,
//       message: "Jadwal diantrikan ke WhatsApp",
//       participantCount: participants.length,
//     });
//   } catch (err: any) {
//     console.error("Error enqueue WA schedule:", err);
//     return NextResponse.json(
//       {
//         ok: false,
//         message: "Gagal mengantrikan pesan WhatsApp",
//       },
//       { status: 500 }
//     );
//   }
// }

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

// Hanya bangun blok jadwal per hari (tanpa header Halo / Terima kasih)
function buildScheduleBlock(
  schedules: {
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
  }[]
) {
  const byDay: Record<number, typeof schedules> = {};
  for (const s of schedules) {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  }

  const lines: string[] = [];

  const sortedDays = Object.keys(byDay)
    .map((d) => Number(d))
    .sort((a, b) => a - b);

  for (const day of sortedDays) {
    const daySchedules = byDay[day].sort((a, b) =>
      a.timeText.localeCompare(b.timeText)
    );
    const dateText = daySchedules[0]?.dateText || "";

    lines.push(`🗓 Hari ${day}, ${dateText}`);
    lines.push("");

    for (const s of daySchedules) {
      const flags: string[] = [];
      if (s.isChanged) flags.push("PERUBAHAN");
      if (s.isAdditional) flags.push("TAMBAHAN");

      const flagLabel = flags.length ? ` [${flags.join(" & ")}]` : "";

      lines.push(`⏰ ${s.timeText}${flagLabel} — ${s.title}`);
      lines.push(`📍 Lokasi: ${s.location}`);

      if (s.locationMapUrl) {
        lines.push(`🗺 Peta: ${s.locationMapUrl}`);
      }

      if (s.hints && (s.hints as string[]).length > 0) {
        lines.push("💡 Petunjuk:");
        for (const h of s.hints as string[]) {
          lines.push(` • ${h}`);
        }
      }

      if (s.description) {
        lines.push(`ℹ️ ${s.description}`);
      }

      lines.push("");
    }

    lines.push("");
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

    if (!trip) {
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
    const scheduleBlock = buildScheduleBlock(
      schedules as any // tipe dari prisma sudah compatible
    );

    // Ambil template SCHEDULE untuk trip ini
    const templateType: WhatsAppTemplateType = "SCHEDULE";
    const { content: templateContent } = await getWhatsAppTemplateContent(
      tripId,
      templateType
    );

    const messagesData = participants.map((p) => {
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
        template: "TRIP_SCHEDULE_FULL",
        content,
        payload: {
          type: "TRIP_SCHEDULE_FULL",
          tripId,
          participantId: p.id,
        },
        status: "PENDING" as const,
      };
    });

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
