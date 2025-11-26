import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type TrashType =
  | "TRIP"
  | "SCHEDULE"
  | "ANNOUNCEMENT"
  | "PARTICIPANT"
  | "USER"
  | "FEEDBACK"
  | "GALLERY"
  | "BADGE"
  | "FLIGHT";

type TrashItem = {
  type: TrashType;
  id: string;
  label: string;
  deletedAt: Date | null;
};

export async function GET() {
  try {
    const [
      trips,
      schedules,
      announcements,
      participants,
      users,
      feedbacks,
      galleries,
      badges,
      flights,
    ] = await Promise.all([
      prisma.trip.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.schedule.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.announcement.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.participant.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.feedback.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.gallery.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.badgeDefinition.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.flight.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

    const items: TrashItem[] = [
      ...trips.map((t) => ({
        type: "TRIP" as const,
        id: t.id,
        label: t.name,
        deletedAt: t.deletedAt,
      })),
      ...schedules.map((s) => ({
        type: "SCHEDULE" as const,
        id: s.id,
        label: `${s.title} (Day ${s.day})`,
        deletedAt: s.deletedAt,
      })),
      ...announcements.map((a) => ({
        type: "ANNOUNCEMENT" as const,
        id: a.id,
        label: a.title,
        deletedAt: a.deletedAt,
      })),
      ...participants.map((p) => ({
        type: "PARTICIPANT" as const,
        id: p.id,
        label: p.name,
        deletedAt: p.deletedAt,
      })),
      ...users.map((u) => ({
        type: "USER" as const,
        id: u.id,
        label: `${u.name} (${u.username})`,
        deletedAt: u.deletedAt,
      })),
      ...feedbacks.map((f) => ({
        type: "FEEDBACK" as const,
        id: f.id,
        label: `Feedback rating ${f.rating}`,
        deletedAt: f.deletedAt,
      })),
      ...galleries.map((g) => ({
        type: "GALLERY" as const,
        id: g.id,
        label: g.note ?? "Foto trip",
        deletedAt: g.deletedAt,
      })),
      ...badges.map((b) => ({
        type: "BADGE" as const,
        id: b.id,
        label: b.name,
        deletedAt: b.deletedAt,
      })),
      ...flights.map((f) => ({
        type: "FLIGHT" as const,
        id: f.id,
        label: `${f.passengerName} - ${f.ticketNumber} (Penerbangan)`,
        deletedAt: f.deletedAt,
      })),
    ];

    return NextResponse.json({ ok: true, data: items });
  } catch (err: any) {
    console.error("GET /api/admin/trash error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// RESTORE
export async function POST(req: Request) {
  try {
    const { type, id } = (await req.json()) as { type: TrashType; id: string };

    switch (type) {
      case "TRIP":
        await prisma.trip.update({ where: { id }, data: { deletedAt: null } });
        break;
      case "SCHEDULE":
        await prisma.schedule.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "ANNOUNCEMENT":
        await prisma.announcement.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "PARTICIPANT":
        await prisma.participant.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "USER":
        await prisma.user.update({
          where: { id },
          data: { deletedAt: null, isActive: true },
        });
        break;
      case "FEEDBACK":
        await prisma.feedback.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "GALLERY":
        await prisma.gallery.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "BADGE":
        await prisma.badgeDefinition.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      case "FLIGHT":
        await prisma.flight.update({
          where: { id },
          data: { deletedAt: null },
        });
        break;
      default:
        return NextResponse.json(
          { ok: false, message: "Invalid type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/admin/trash/restore error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// HARD DELETE (hapus permanen)
export async function DELETE(req: Request) {
  try {
    const { type, id } = (await req.json()) as { type: TrashType; id: string };

    switch (type) {
      case "TRIP":
        await prisma.trip.delete({ where: { id } });
        break;
      case "SCHEDULE":
        await prisma.schedule.delete({ where: { id } });
        break;
      case "ANNOUNCEMENT":
        await prisma.announcement.delete({ where: { id } });
        break;
      case "PARTICIPANT":
        await prisma.participant.delete({ where: { id } });
        break;
      case "USER":
        await prisma.user.delete({ where: { id } });
        break;
      case "FEEDBACK":
        await prisma.feedback.delete({ where: { id } });
        break;
      case "GALLERY":
        await prisma.gallery.delete({ where: { id } });
        break;
      case "BADGE":
        await prisma.badgeDefinition.delete({ where: { id } });
        break;
      case "FLIGHT":
        await prisma.flight.delete({ where: { id } });
        break;
      default:
        return NextResponse.json(
          { ok: false, message: "Invalid type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/trash error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
