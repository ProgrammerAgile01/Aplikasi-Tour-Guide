import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type SessionPayload = {
  user?: {
    id: string;
    role: string;
  };
};

type DailyAttendanceRow = {
  day: string;
  date: string;
  count: number;
  total: number;
  percentage: number;
};

type TopAgendaRow = {
  title: string;
  checkins: number;
  percentage: number;
};

type PhotoStatRow = {
  day: string;
  uploaded: number;
  approved: number;
  pending: number;
};

async function buildReportData(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, name: true },
  });

  if (!trip) throw new Error("Trip tidak ditemukan");

  const [totalParticipants, schedules, attendances, galleries] =
    await Promise.all([
      prisma.participant.count({ where: { tripId } }),
      prisma.schedule.findMany({
        where: { tripId },
        select: {
          id: true,
          day: true,
          dateText: true,
          title: true,
        },
      }),
      prisma.attendance.findMany({
        where: { tripId },
        select: {
          id: true,
          participantId: true,
          sessionId: true,
        },
      }),
      prisma.gallery.findMany({
        where: { tripId },
        select: {
          id: true,
          sessionId: true,
          status: true, // PENDING / APPROVED
        },
      }),
    ]);

  const scheduleMap = new Map<
    string,
    { id: string; day: number; dateText: string; title: string }
  >();
  for (const s of schedules) scheduleMap.set(s.id, s);

  // ==== DAILY ATTENDANCE ====
  const dayBuckets = new Map<
    number,
    { dateText: string; participants: Set<string> }
  >();
  for (const s of schedules) {
    if (!dayBuckets.has(s.day)) {
      dayBuckets.set(s.day, { dateText: s.dateText, participants: new Set() });
    }
  }

  const sessionCounts = new Map<string, number>();
  for (const a of attendances) {
    const sched = scheduleMap.get(a.sessionId);
    if (!sched) continue;
    sessionCounts.set(a.sessionId, (sessionCounts.get(a.sessionId) ?? 0) + 1);

    const bucket = dayBuckets.get(sched.day);
    if (bucket && a.participantId) bucket.participants.add(a.participantId);
  }

  const dayEntries = Array.from(dayBuckets.entries()).sort(
    (a, b) => a[0] - b[0]
  );

  const dailyAttendance: DailyAttendanceRow[] = dayEntries.map(
    ([, bucket], idx) => {
      const total = totalParticipants || 0;
      const count = bucket.participants.size;
      const percentage =
        total > 0 ? parseFloat(((count * 100) / total).toFixed(1)) : 0;
      return {
        day: `Hari ${idx + 1}`,
        date: bucket.dateText,
        count,
        total,
        percentage,
      };
    }
  );

  const avgAttendancePercent =
    dailyAttendance.length > 0
      ? parseFloat(
          (
            dailyAttendance.reduce((s, d) => s + d.percentage, 0) /
            dailyAttendance.length
          ).toFixed(1)
        )
      : null;

  // ==== TOP AGENDA ====
  const agendaRaw = schedules.map((s) => {
    const checkins = sessionCounts.get(s.id) ?? 0;
    return { id: s.id, title: s.title, checkins };
  });

  const agendaNonZero = agendaRaw
    .filter((a) => a.checkins > 0)
    .sort((a, b) => b.checkins - a.checkins)
    .slice(0, 5);

  const topAgenda: TopAgendaRow[] = agendaNonZero.map((a) => ({
    title: a.title,
    checkins: a.checkins,
    percentage:
      totalParticipants > 0
        ? parseFloat(((a.checkins * 100) / totalParticipants).toFixed(1))
        : 0,
  }));

  // ==== GALERI / FOTO ====
  const totalPhotoUploaded = galleries.length;

  const photoDayBuckets = new Map<
    number,
    { dateText: string; uploaded: number; approved: number; pending: number }
  >();

  for (const g of galleries) {
    const sched = g.sessionId ? scheduleMap.get(g.sessionId) : null;
    if (!sched) continue;

    const dayKey = sched.day;
    let bucket = photoDayBuckets.get(dayKey);
    if (!bucket) {
      bucket = {
        dateText: sched.dateText,
        uploaded: 0,
        approved: 0,
        pending: 0,
      };
      photoDayBuckets.set(dayKey, bucket);
    }

    bucket.uploaded += 1;
    if (g.status === "APPROVED") {
      bucket.approved += 1;
    } else {
      bucket.pending += 1;
    }
  }

  const photoStats: PhotoStatRow[] = Array.from(photoDayBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, bucket]) => ({
      day: `Hari ${day} - ${bucket.dateText}`,
      uploaded: bucket.uploaded,
      approved: bucket.approved,
      pending: bucket.pending,
    }));

  return {
    trip,
    totalParticipants,
    totalSchedules: schedules.length,
    avgAttendancePercent,
    totalPhotoUploaded,
    dailyAttendance,
    topAgenda,
    photoStats,
  };
}

/* =========================
 *   EXCEL (XLSX)
 * ========================= */

function buildExcelBuffer(report: Awaited<ReturnType<typeof buildReportData>>) {
  const {
    trip,
    totalParticipants,
    totalSchedules,
    avgAttendancePercent,
    totalPhotoUploaded,
    dailyAttendance,
    topAgenda,
    photoStats,
  } = report;

  const nowText = new Date().toLocaleString("id-ID");

  const sheetData: any[][] = [
    ["LAPORAN PERJALANAN", trip.name],
    ["Tanggal Ekspor", nowText],
    [],
    ["Ringkasan"],
    ["Total Peserta", totalParticipants],
    ["Total Agenda", totalSchedules],
    ["Total Foto Terunggah", totalPhotoUploaded],
    [
      "Rata-rata Kehadiran",
      avgAttendancePercent !== null ? `${avgAttendancePercent}%` : "-",
    ],
    [],
    ["Kehadiran per Hari"],
    ["Hari", "Tanggal", "Hadir", "Total", "Persentase"],
    ...dailyAttendance.map((d) => [
      d.day,
      d.date,
      d.count,
      d.total,
      `${d.percentage}%`,
    ]),
    [],
    ["Top Agenda"],
    ["Agenda", "Check-in", "Persentase"],
    ...topAgenda.map((a) => [a.title, a.checkins, `${a.percentage}%`]),
  ];

  // Tambahan: Statistik Foto jika ada
  if (photoStats.length > 0) {
    const totalUploaded = photoStats.reduce((s, x) => s + x.uploaded, 0);
    const totalApproved = photoStats.reduce((s, x) => s + x.approved, 0);
    const totalPending = photoStats.reduce((s, x) => s + x.pending, 0);
    const approvalRate =
      totalUploaded > 0 ? Math.round((totalApproved / totalUploaded) * 100) : 0;

    sheetData.push(
      [],
      ["Statistik Foto Peserta"],
      ["Periode", "Total Upload", "Disetujui", "Menunggu", "Persentase Setuju"],
      ...photoStats.map((p) => [
        p.day,
        p.uploaded,
        p.approved,
        p.pending,
        p.uploaded > 0
          ? `${Math.round((p.approved / p.uploaded) * 100)}%`
          : "0%",
      ]),
      ["Total", totalUploaded, totalApproved, totalPending, `${approvalRate}%`]
    );
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf as Buffer;
}

/* =========================
 *   PDF (pdf-lib)
 * ========================= */

function getLogoPath(): string | null {
  // Sesuaikan dengan file logo yang kamu pakai (png/jpg)
  const candidatePng = path.join(process.cwd(), "public", "logo-tourguide.png");
  const candidateJpg = path.join(process.cwd(), "public", "logo-tourguide.jpg");
  const candidateJpeg = path.join(
    process.cwd(),
    "public",
    "logo-tourguide.jpeg"
  );

  if (fs.existsSync(candidatePng)) return candidatePng;
  if (fs.existsSync(candidateJpg)) return candidateJpg;
  if (fs.existsSync(candidateJpeg)) return candidateJpeg;
  return null;
}

async function buildPdfBuffer(
  report: Awaited<ReturnType<typeof buildReportData>>
) {
  const {
    trip,
    totalParticipants,
    totalSchedules,
    avgAttendancePercent,
    totalPhotoUploaded,
    dailyAttendance,
    topAgenda,
    photoStats,
  } = report;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header bar
  const headerHeight = 70;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: rgb(0.06, 0.09, 0.16), // slate-900
  });

  // Logo (optional)
  const logoPath = getLogoPath();
  if (logoPath) {
    try {
      const imgBytes = await fs.promises.readFile(logoPath);
      let logoImage;
      if (logoPath.endsWith(".png")) {
        logoImage = await pdfDoc.embedPng(imgBytes);
      } else {
        logoImage = await pdfDoc.embedJpg(imgBytes);
      }
      // Maksimum tinggi logo agar tidak nabrak header
      const maxLogoHeight = headerHeight - 20; // 20 px padding atas bawah
      const scale = maxLogoHeight / logoImage.height;

      const logoWidth = logoImage.width * scale;
      const logoHeight = logoImage.height * scale;

      page.drawImage(logoImage, {
        x: 40,
        y: height - headerHeight + (headerHeight - logoHeight) / 2,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (e) {
      console.warn("Gagal memuat logo:", e);
    }
  }

  // Title
  const titleX = logoPath ? 140 : 40;
  page.drawText("Laporan Trip", {
    x: titleX,
    y: height - 35,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(trip.name, {
    x: titleX,
    y: height - 55,
    size: 12,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });

  // Body start
  let cursorY = height - headerHeight - 40;

  const writeLabelValue = (label: string, value: string) => {
    const labelWidth = fontBold.widthOfTextAtSize(label, 11);
    page.drawText(label, {
      x: 40,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.11),
    });
    page.drawText(value, {
      x: 40 + labelWidth + 6,
      y: cursorY,
      size: 11,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 16;
  };

  const nowText = new Date().toLocaleString("id-ID");
  page.drawText(`Tanggal ekspor: ${nowText}`, {
    x: width - 220,
    y: height - headerHeight - 20,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Ringkasan
  page.drawText("Ringkasan", {
    x: 40,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: rgb(0.07, 0.09, 0.11),
  });
  cursorY -= 22;

  writeLabelValue("Total peserta", String(totalParticipants));
  writeLabelValue("Total agenda", String(totalSchedules));
  writeLabelValue("Total foto terunggah", String(totalPhotoUploaded));
  writeLabelValue(
    "Rata-rata kehadiran",
    avgAttendancePercent !== null ? `${avgAttendancePercent}%` : "-"
  );

  cursorY -= 10;

  // Kehadiran per Hari
  page.drawText("Kehadiran per Hari", {
    x: 40,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: rgb(0.07, 0.09, 0.11),
  });
  cursorY -= 20;

  const colX = [40, 120, 280, 340, 410];

  const drawRow = (y: number, row: string[], header = false) => {
    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: colX[i],
        y,
        size: 10,
        font: header ? fontBold : fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
  };

  drawRow(cursorY, ["Hari", "Tanggal", "Hadir", "Total", "%"], true);
  cursorY -= 16;

  dailyAttendance.forEach((d) => {
    if (cursorY < 80) {
      const newPage = pdfDoc.addPage();
      cursorY = newPage.getSize().height - 80;
    }
    drawRow(cursorY, [
      d.day,
      d.date,
      String(d.count),
      String(d.total),
      `${d.percentage}%`,
    ]);
    cursorY -= 14;
  });

  cursorY -= 20;

  // Top Agenda
  page.drawText("Top Agenda Paling Banyak Dikonfirmasi", {
    x: 40,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: rgb(0.07, 0.09, 0.11),
  });
  cursorY -= 20;

  const colX2 = [40, 300, 380];

  const drawRow2 = (y: number, row: string[], header = false) => {
    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: colX2[i],
        y,
        size: 10,
        font: header ? fontBold : fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
  };

  drawRow2(cursorY, ["Agenda", "Check-in", "%"], true);
  cursorY -= 16;

  topAgenda.forEach((a) => {
    if (cursorY < 80) {
      const newPage = pdfDoc.addPage();
      cursorY = newPage.getSize().height - 80;
    }
    drawRow2(cursorY, [a.title, String(a.checkins), `${a.percentage}%`]);
    cursorY -= 14;
  });

  // Statistik Foto (kalau ada)
  if (photoStats.length > 0) {
    cursorY -= 20;
    const pageForPhoto = cursorY < 120 ? pdfDoc.addPage() : page; // kalau sisa sempit, pakai halaman baru
    if (cursorY < 120) {
      const size = pageForPhoto.getSize();
      cursorY = size.height - 80;
    }

    pageForPhoto.drawText("Statistik Foto yang Diunggah Peserta", {
      x: 40,
      y: cursorY,
      size: 14,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.11),
    });
    cursorY -= 20;

    const colX3 = [40, 260, 340, 420, 500];

    const drawRow3 = (y: number, row: string[], header = false) => {
      row.forEach((cell, i) => {
        pageForPhoto.drawText(cell, {
          x: colX3[i],
          y,
          size: 9,
          font: header ? fontBold : fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    };

    drawRow3(
      cursorY,
      ["Periode", "Upload", "Disetujui", "Menunggu", "%"],
      true
    );
    cursorY -= 14;

    const totalUploaded = photoStats.reduce((s, x) => s + x.uploaded, 0);
    const totalApproved = photoStats.reduce((s, x) => s + x.approved, 0);
    const totalPending = photoStats.reduce((s, x) => s + x.pending, 0);
    const approvalRate =
      totalUploaded > 0 ? Math.round((totalApproved / totalUploaded) * 100) : 0;

    photoStats.forEach((p) => {
      if (cursorY < 80) {
        const newPage = pdfDoc.addPage();
        cursorY = newPage.getSize().height - 80;
      }
      const percent =
        p.uploaded > 0
          ? `${Math.round((p.approved / p.uploaded) * 100)}%`
          : "0%";

      drawRow3(cursorY, [
        p.day,
        String(p.uploaded),
        String(p.approved),
        String(p.pending),
        percent,
      ]);
      cursorY -= 12;
    });

    // Total row
    cursorY -= 10;
    drawRow3(cursorY, [
      "Total",
      String(totalUploaded),
      String(totalApproved),
      String(totalPending),
      `${approvalRate}%`,
    ]);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* =========================
 *   HANDLER
 * ========================= */

export async function GET(req: Request) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const tripId = url.searchParams.get("tripId");
    const format = (url.searchParams.get("format") || "excel").toLowerCase();

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Parameter tripId wajib diisi" },
        { status: 400 }
      );
    }
    if (format !== "excel" && format !== "pdf") {
      return NextResponse.json(
        { ok: false, message: "Format harus excel atau pdf" },
        { status: 400 }
      );
    }

    const report = await buildReportData(tripId);

    if (format === "excel") {
      const buf = buildExcelBuffer(report);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-${report.trip.name}.xlsx"`,
        },
      });
    } else {
      const buf = await buildPdfBuffer(report);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="laporan-${report.trip.name}.pdf"`,
        },
      });
    }
  } catch (err: any) {
    console.error("GET /api/reports/export error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
