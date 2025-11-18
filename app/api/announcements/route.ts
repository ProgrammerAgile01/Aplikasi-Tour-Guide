// import { NextResponse, NextRequest } from "next/server";
// import prisma from "@/lib/prisma";
// import { z } from "zod";
// import {
//   getWhatsAppTemplateContent,
//   applyTemplate,
//   WhatsAppTemplateType,
// } from "@/lib/whatsapp-templates";

// const CreateSchema = z.object({
//   tripId: z.string().trim().min(1),
//   title: z.string().trim().min(1),
//   content: z.string().trim().min(1),
//   // FE kirim "normal" | "important"
//   priority: z.enum(["normal", "important"]).default("normal"),
//   isPinned: z.coerce.boolean().default(false),
// });

// function toEnumUpper(p: "normal" | "important") {
//   return (p === "important" ? "IMPORTANT" : "NORMAL") as "IMPORTANT" | "NORMAL";
// }

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const tripId = searchParams.get("tripId")?.trim();
//     if (!tripId) {
//       return NextResponse.json(
//         { ok: false, message: "tripId wajib diisi." },
//         { status: 400 }
//       );
//     }

//     const q = searchParams.get("q") ?? "";
//     const take = Number(searchParams.get("take") ?? 200);
//     const skip = Number(searchParams.get("skip") ?? 0);

//     const where = {
//       tripId,
//       ...(q
//         ? {
//             OR: [
//               { title: { contains: q, mode: "insensitive" } },
//               { content: { contains: q, mode: "insensitive" } },
//             ],
//           }
//         : {}),
//     };

//     const [items, total] = await Promise.all([
//       prisma.announcement.findMany({
//         where,
//         orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
//         take,
//         skip,
//       }),
//       prisma.announcement.count({ where }),
//     ]);

//     const mapped = items.map((a) => ({
//       ...a,
//       priority: String(a.priority).toLowerCase() as "normal" | "important",
//     }));

//     return NextResponse.json({ ok: true, total, items: mapped });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     const json = await req.json();
//     const data = CreateSchema.parse(json);

//     const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
//     if (!trip) {
//       return NextResponse.json(
//         { ok: false, message: "Trip tidak ditemukan." },
//         { status: 404 }
//       );
//     }

//     const created = await prisma.announcement.create({
//       data: {
//         tripId: data.tripId,
//         title: data.title,
//         content: data.content,
//         priority: toEnumUpper(data.priority) as any,
//         isPinned: data.isPinned,
//       },
//     });

//     // Kirim ke WhatsApp via queue (non-blocking)
//     try {
//       const participants = await prisma.participant.findMany({
//         where: { tripId: data.tripId },
//       });

//       if (participants.length > 0) {
//         const type: WhatsAppTemplateType = "ANNOUNCEMENT";
//         const { content: templateContent } = await getWhatsAppTemplateContent(
//           data.tripId,
//           type
//         );

//         const priorityHeader =
//           data.priority === "important"
//             ? "❗ *Pengumuman PENTING untuk Trip Anda*"
//             : "📢 Pengumuman untuk Trip Anda";

//         const messagesData = participants.map((p) => {
//           const content = applyTemplate(templateContent, {
//             participant_name: p.name,
//             trip_name: trip.name,
//             trip_location: trip.location ?? "",
//             announcement_title: created.title,
//             announcement_content: created.content,
//             priority: data.priority,
//             priority_header: priorityHeader,
//           });

//           return {
//             tripId: data.tripId,
//             participantId: p.id,
//             to: p.whatsapp,
//             template: "TRIP_ANNOUNCEMENT",
//             content,
//             payload: {
//               type: "TRIP_ANNOUNCEMENT",
//               tripId: data.tripId,
//               announcementId: created.id,
//               priority: data.priority,
//             },
//             status: "PENDING" as const,
//           };
//         });

//         await prisma.whatsAppMessage.createMany({
//           data: messagesData,
//         });
//       }
//     } catch (waErr) {
//       console.error("Gagal enqueue WA untuk pengumuman:", waErr);
//     }

//     // Trigger worker WA
//     try {
//       const origin = new URL(req.url).origin;
//       fetch(`${origin}/api/wa/worker-send`, {
//         method: "POST",
//       }).catch((e) => {
//         console.error("Gagal memanggil worker-send:", e);
//       });
//     } catch (e) {
//       console.error("Error saat trigger worker-send:", e);
//     }

//     return NextResponse.json(
//       {
//         ok: true,
//         item: { ...created, priority: data.priority },
//       },
//       { status: 201 }
//     );
//   } catch (e: any) {
//     if (e?.name === "ZodError") {
//       return NextResponse.json(
//         { ok: false, message: "Validasi gagal", issues: e.issues },
//         { status: 400 }
//       );
//     }
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  tripId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  // FE kirim "normal" | "important"
  priority: z.enum(["normal", "important"]).default("normal"),
  isPinned: z.coerce.boolean().default(false),
});

function toEnumUpper(p: "normal" | "important") {
  return (p === "important" ? "IMPORTANT" : "NORMAL") as "IMPORTANT" | "NORMAL";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId")?.trim();
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi." },
        { status: 400 }
      );
    }

    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 200);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where = {
      tripId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take,
        skip,
      }),
      prisma.announcement.count({ where }),
    ]);

    const mapped = items.map((a) => ({
      ...a,
      priority: String(a.priority).toLowerCase() as "normal" | "important",
    }));

    return NextResponse.json({ ok: true, total, items: mapped });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = CreateSchema.parse(json);

    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan." },
        { status: 404 }
      );
    }

    const created = await prisma.announcement.create({
      data: {
        tripId: data.tripId,
        title: data.title,
        content: data.content,
        priority: toEnumUpper(data.priority) as any,
        isPinned: data.isPinned,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        item: { ...created, priority: data.priority },
      },
      { status: 201 }
    );
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
