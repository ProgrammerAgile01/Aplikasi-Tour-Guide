import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getWhatsAppTemplateContent,
  applyTemplate,
  WhatsAppTemplateType,
} from "@/lib/whatsapp-templates";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: { id?: string } }) {
  try {
    // 1) ambil id dari params
    let id = ctx.params?.id;

    // 2) fallback: parse dari URL kalau perlu
    if (!id) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);
      // ex: ["api", "announcements", "abc123", "send-whatsapp"]
      const idx = parts.indexOf("announcements");
      if (idx !== -1 && parts[idx + 1]) {
        id = parts[idx + 1];
      }
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "id pengumuman wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil pengumuman + trip
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { ok: false, message: "Pengumuman tidak ditemukan" },
        { status: 404 }
      );
    }

    const trip = announcement.trip;
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip untuk pengumuman ini tidak ditemukan" },
        { status: 404 }
      );
    }

    const tripId = trip.id;

    // Ambil semua peserta trip
    const participants = await prisma.participant.findMany({
      where: { tripId },
    });

    if (participants.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Belum ada peserta di trip ini" },
        { status: 400 }
      );
    }

    // Ambil template WA untuk pengumuman
    const type: WhatsAppTemplateType = "ANNOUNCEMENT";
    const { content: templateContent } = await getWhatsAppTemplateContent(
      tripId,
      type
    );

    // priority enum di DB: "NORMAL" | "IMPORTANT"
    const priority = String(announcement.priority).toLowerCase() as
      | "normal"
      | "important";

    const priorityHeader =
      priority === "important"
        ? "❗ *Pengumuman PENTING untuk Trip Anda*"
        : "📢 Pengumuman untuk Trip Anda";

    const messagesData = participants.map((p) => {
      const content = applyTemplate(templateContent, {
        participant_name: p.name,
        trip_name: trip.name,
        trip_location: trip.location ?? "",
        announcement_title: announcement.title,
        announcement_content: announcement.content,
        priority,
        priority_header: priorityHeader,
      });

      return {
        tripId,
        participantId: p.id,
        to: p.whatsapp,
        template: "TRIP_ANNOUNCEMENT",
        content,
        payload: {
          type: "TRIP_ANNOUNCEMENT",
          tripId,
          announcementId: announcement.id,
          priority,
        },
        status: "PENDING" as const,
      };
    });

    await prisma.whatsAppMessage.createMany({
      data: messagesData,
    });

    // Trigger worker WA (fire & forget)
    try {
      const origin = new URL(req.url).origin;
      fetch(`${origin}/api/wa/worker-send`, {
        method: "POST",
      }).catch((e) => {
        console.error("Gagal memanggil worker-send:", e);
      });
    } catch (e) {
      console.error("Error saat trigger worker-send:", e);
    }

    return NextResponse.json({
      ok: true,
      message: "Pengumuman diantrikan ke WhatsApp",
      participantCount: participants.length,
    });
  } catch (e: any) {
    console.error("Error enqueue WA announcement:", e);
    return NextResponse.json(
      {
        ok: false,
        message: e?.message ?? "Gagal mengantrikan pesan WhatsApp",
      },
      { status: 500 }
    );
  }
}
