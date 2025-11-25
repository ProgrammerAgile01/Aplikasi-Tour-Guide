import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

async function resolveId(req: Request, params: any) {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p && (p.id ?? p["0"]);
    if (idFromParams) return idFromParams;
  } catch {}
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// helper untuk auto-fit lebar kolom berdasarkan data (AOA)
function autoFitColumns(ws: XLSX.WorkSheet, data: any[][]) {
  if (!data || data.length === 0) return;

  const colCount = data[0].length;
  const colWidths = new Array(colCount).fill(10) as number[];

  data.forEach((row) => {
    row.forEach((val, i) => {
      const str = val == null ? "" : String(val);
      colWidths[i] = Math.max(colWidths[i], str.length + 2); // padding +2
    });
  });

  (ws as any)["!cols"] = colWidths.map((w) => ({ wch: w }));
}

export async function GET(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  try {
    const tripId = await resolveId(req, params);

    const session = await getSessionFromRequest(req);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cari hubungan user ↔ trip ↔ participant
    const userTrip = await prisma.userTrip.findFirst({
      where: {
        userId,
        tripId,
      },
      include: {
        participant: true,
        trip: true,
      },
    });

    if (!userTrip || !userTrip.participant || !userTrip.trip) {
      return NextResponse.json(
        { ok: false, message: "Data peserta untuk trip ini tidak ditemukan" },
        { status: 404 }
      );
    }

    const participant = userTrip.participant;
    const trip = userTrip.trip;

    // Ambil semua agenda + attendance peserta ini
    const [schedules, galleryCount, badgeCount, feedbackAgg] =
      await Promise.all([
        prisma.schedule.findMany({
          where: { tripId },
          orderBy: [{ day: "asc" }, { timeText: "asc" }],
          include: {
            attendances: {
              where: { participantId: participant.id },
            },
          },
        }),
        prisma.gallery.count({
          where: { tripId, participantId: participant.id },
        }),
        prisma.participantBadge.count({
          where: { tripId, participantId: participant.id },
        }),
        prisma.feedback.aggregate({
          where: { tripId, participantId: participant.id },
          _count: { _all: true },
          _avg: { rating: true },
        }),
      ]);

    const feedbackCount = feedbackAgg._count?._all ?? 0;
    const avgRatingRaw = feedbackAgg._avg?.rating ?? null;
    const avgRating =
      avgRatingRaw != null ? Number(avgRatingRaw.toFixed(2)) : null;

    // ====== BANGUN WORKBOOK EXCEL ======
    const wb = XLSX.utils.book_new();

    // --- Sheet 1: Profil ---
    const genderLabel =
      participant.gender === "MALE"
        ? "Laki-laki"
        : participant.gender === "FEMALE"
        ? "Perempuan"
        : "";

    const profileData: (string | number | null)[][] = [
      ["Nama", participant.name],
      ["Nomor WhatsApp", participant.whatsapp],
      ["Trip", trip.name],
      ["Lokasi Trip", trip.location],
      [
        "Periode Trip",
        `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
      ],
      ["Total Check-in", participant.totalCheckIns ?? 0],
      ["NIK", participant.nik ?? ""],
      ["Jenis Kelamin", genderLabel],
      ["Tempat Lahir", participant.birthPlace ?? ""],
      ["Tanggal Lahir", formatDate(participant.birthDate ?? undefined)],
      ["Nomor Kamar", participant.roomNumber ?? ""],
      ["Catatan", participant.note ?? ""],

      // ==== Ringkasan Aktivitas ====
      ["Jumlah Foto di Galeri", galleryCount],
      ["Jumlah Badge", badgeCount],
      ["Jumlah Feedback", feedbackCount],
      ["Rata-rata Rating", avgRating != null ? avgRating : ""],
    ];

    const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
    autoFitColumns(wsProfile, profileData);
    XLSX.utils.book_append_sheet(wb, wsProfile, "Profil");

    // --- Sheet 2: Kehadiran ---
    const attendanceHeader = [
      "Hari",
      "Tanggal",
      "Jam",
      "Judul Agenda",
      "Lokasi",
      "Status Absen",
      "Metode",
      "Waktu Absen",
    ];

    const attendanceRows: (string | number)[][] = schedules.map((s) => {
      const att = s.attendances[0]; // maksimal 1 karena @@unique([participantId, sessionId])
      const statusAbsen = att ? "HADIR" : "BELUM ABSEN";
      const method = att ? att.method : "";
      const checkedAt = att ? formatDateTime(att.checkedAt) : "";

      return [
        s.day,
        s.dateText,
        s.timeText,
        s.title,
        s.location,
        statusAbsen,
        method,
        checkedAt,
      ];
    });

    const attendanceAoA = [attendanceHeader, ...attendanceRows];
    const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceAoA);
    autoFitColumns(wsAttendance, attendanceAoA);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Kehadiran");

    // Tulis workbook ke buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `rekap-trip-${trip.id}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[Export Participant Excel] error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal membuat file Excel" },
      { status: 500 }
    );
  }
}
