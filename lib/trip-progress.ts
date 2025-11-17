import prisma from "@/lib/prisma";

export async function updateTripStatusIfAllCompleted(tripId: string) {
  if (!tripId) return;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { status: true },
  });

  // kalau trip tidak ada atau sudah completed → stop
  if (!trip || trip.status === "completed") return;

  // hitung peserta
  const participantsCount = await prisma.participant.count({
    where: { tripId },
  });

  if (!participantsCount) return;

  // hitung SEMUA sesi untuk trip ini (tidak peduli isChanged/isAdditional)
  const requiredSessionsCount = await prisma.schedule.count({
    where: { tripId },
  });

  if (!requiredSessionsCount) return;

  // hitung kehadiran per participant
  const grouped = await prisma.attendance.groupBy({
    by: ["participantId"],
    where: { tripId },
    _count: { sessionId: true },
  });

  // cek siapa yang hadir di SEMUA sesi
  const fullyCompleted = grouped.filter(
    (g) => g._count.sessionId === requiredSessionsCount
  ).length;

  // kalau semuanya lengkap → tandai selesai
  if (fullyCompleted === participantsCount) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "completed" },
    });
  }
}
