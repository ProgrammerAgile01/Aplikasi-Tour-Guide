import prisma from "@/lib/prisma";
import { BadgeConditionType } from "@prisma/client";

/**
 * Dipanggil setelah peserta berhasil check-in di suatu sesi.
 * Mencari badge dengan conditionType CHECKIN_SESSION untuk sesi itu.
 */
export async function checkBadgesAfterCheckin(opts: {
  tripId: string;
  sessionId: string;
  participantId: string;
}) {
  const { tripId, sessionId, participantId } = opts;

  const defs = await prisma.badgeDefinition.findMany({
    where: {
      tripId,
      conditionType: BadgeConditionType.CHECKIN_SESSION,
      sessionId,
      isActive: true,
    },
  });

  const newlyUnlocked = [];

  for (const def of defs) {
    const exists = await prisma.participantBadge.findFirst({
      where: {
        badgeId: def.id,
        participantId,
      },
    });
    if (exists) continue;

    const pb = await prisma.participantBadge.create({
      data: {
        tripId,
        participantId,
        badgeId: def.id,
      },
      include: { badge: true },
    });

    newlyUnlocked.push(pb.badge);
  }

  return newlyUnlocked; // array BadgeDefinition
}

/**
 * Dipanggil setelah upload foto (biasanya saat APPROVED).
 * Cek badge GALLERY_UPLOAD_SESSION berdasarkan count foto.
 */
export async function checkBadgesAfterGalleryUpload(opts: {
  tripId: string;
  sessionId: string;
  participantId: string;
}) {
  const { tripId, sessionId, participantId } = opts;

  const defs = await prisma.badgeDefinition.findMany({
    where: {
      tripId,
      conditionType: BadgeConditionType.GALLERY_UPLOAD_SESSION,
      sessionId,
      isActive: true,
    },
  });

  if (!defs.length) return [];

  const totalApproved = await prisma.gallery.count({
    where: {
      tripId,
      sessionId,
      participantId,
      status: "APPROVED", // kalau mau hitung semua, hilangkan filter ini
    },
  });

  const newlyUnlocked = [];

  for (const def of defs) {
    const target = def.targetValue ?? 1;
    if (totalApproved < target) continue;

    const exists = await prisma.participantBadge.findFirst({
      where: { badgeId: def.id, participantId },
    });
    if (exists) continue;

    const pb = await prisma.participantBadge.create({
      data: {
        tripId,
        participantId,
        badgeId: def.id,
      },
      include: { badge: true },
    });

    newlyUnlocked.push(pb.badge);
  }

  return newlyUnlocked;
}

/**
 * Dipanggil setelah check-in (atau secara berkala) untuk cek badge COMPLETE_ALL_SESSIONS.
 */
export async function checkBadgesAfterAttendanceSummary(opts: {
  tripId: string;
  participantId: string;
}) {
  const { tripId, participantId } = opts;

  const defs = await prisma.badgeDefinition.findMany({
    where: {
      tripId,
      conditionType: BadgeConditionType.COMPLETE_ALL_SESSIONS,
      isActive: true,
    },
  });

  if (!defs.length) return [];

  const totalSessions = await prisma.schedule.count({ where: { tripId } });
  if (totalSessions === 0) return [];

  const attendedSessions = await prisma.attendance.count({
    where: { tripId, participantId },
  });

  if (attendedSessions < totalSessions) return [];

  const newlyUnlocked = [];

  for (const def of defs) {
    const exists = await prisma.participantBadge.findFirst({
      where: { badgeId: def.id, participantId },
    });
    if (exists) continue;

    const pb = await prisma.participantBadge.create({
      data: {
        tripId,
        participantId,
        badgeId: def.id,
      },
      include: { badge: true },
    });

    newlyUnlocked.push(pb.badge);
  }

  return newlyUnlocked;
}
