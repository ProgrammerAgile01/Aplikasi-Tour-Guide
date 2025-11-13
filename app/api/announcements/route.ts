// import { NextResponse, NextRequest } from "next/server";
// import prisma from "@/lib/prisma";
// import { z } from "zod";

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

//     // map priority UPPERCASE -> lowercase utk FE
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

//     return NextResponse.json(
//       {
//         ok: true,
//         item: { ...created, priority: data.priority }, // kirim balik lowercase
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

function buildAnnouncementMessage(opts: {
  trip: any;
  announcement: any;
  participant: any;
  priority: "normal" | "important";
}) {
  const { trip, announcement, participant, priority } = opts;

  const lines: string[] = [];

  lines.push(`Halo ${participant.name}! 👋`);
  lines.push("");

  if (priority === "important") {
    lines.push("❗ *Pengumuman PENTING untuk Trip Anda*");
  } else {
    lines.push("📢 Pengumuman untuk Trip Anda");
  }

  lines.push("");
  lines.push(`Trip: *${trip.name}*`);
  lines.push(`Lokasi: ${trip.location}`);
  lines.push("");

  lines.push(`📌 *${announcement.title}*`);
  lines.push("");
  lines.push(announcement.content);
  lines.push("");

  lines.push("Jika ada pertanyaan, silakan hubungi tour leader / admin.");
  lines.push("Terima kasih 🙏");

  return lines.join("\n");
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

    // map priority UPPERCASE -> lowercase utk FE
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

    // cek trip
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan." },
        { status: 404 }
      );
    }

    // simpan announcement di DB
    const created = await prisma.announcement.create({
      data: {
        tripId: data.tripId,
        title: data.title,
        content: data.content,
        priority: toEnumUpper(data.priority) as any,
        isPinned: data.isPinned,
      },
    });

    // Kirim ke WhatsApp via queue (non-blocking ke FE, kalau error tetap lanjut)
    try {
      const participants = await prisma.participant.findMany({
        where: { tripId: data.tripId },
      });

      if (participants.length > 0) {
        const messagesData = participants.map((p) => {
          const content = buildAnnouncementMessage({
            trip,
            announcement: created,
            participant: p,
            priority: data.priority,
          });

          return {
            tripId: data.tripId,
            participantId: p.id,
            to: p.whatsapp,
            template: "TRIP_ANNOUNCEMENT",
            content,
            payload: {
              type: "TRIP_ANNOUNCEMENT",
              tripId: data.tripId,
              announcementId: created.id,
              priority: data.priority,
            },
            status: "PENDING" as const,
          };
        });

        await prisma.whatsAppMessage.createMany({
          data: messagesData,
        });
      }
    } catch (waErr) {
      // kalau enqueue WA gagal, cukup log; jangan gagalkan pembuatan pengumuman
      console.error("Gagal enqueue WA untuk pengumuman:", waErr);
    }

    // Trigger worker WA
    try {
      const origin = new URL(req.url).origin; // contoh: http://localhost:3010

      // jalanin async, tapi nggak di-await supaya FE nggak nunggu
      fetch(`${origin}/api/wa/worker-send`, {
        method: "POST",
      }).catch((e) => {
        console.error("Gagal memanggil worker-send:", e);
      });
    } catch (e) {
      console.error("Error saat trigger worker-send:", e);
    }

    return NextResponse.json(
      {
        ok: true,
        item: { ...created, priority: data.priority }, // kirim balik lowercase
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
