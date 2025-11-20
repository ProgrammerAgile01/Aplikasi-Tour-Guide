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
    select: { id: true, name: true, deletedAt: true },
  });

  if (!trip || trip.deletedAt) throw new Error("Trip tidak ditemukan");

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

  const wb = XLSX.utils.book_new();

  /* =========================
   *  SHEET 1: Ringkasan & Kehadiran
   * ========================= */
  const summaryData: any[][] = [];

  // Judul besar
  summaryData.push(["LAPORAN PERJALANAN"]);
  summaryData.push([trip.name]);
  summaryData.push(["Tanggal ekspor", nowText]);
  summaryData.push([]);

  // Ringkasan Trip
  summaryData.push(["RINGKASAN TRIP"]);
  summaryData.push([
    "Total peserta",
    totalParticipants,
    "",
    "Total agenda",
    totalSchedules,
  ]);
  summaryData.push([
    "Total foto terunggah",
    totalPhotoUploaded,
    "",
    "Rata-rata kehadiran",
    avgAttendancePercent !== null ? `${avgAttendancePercent}%` : "-",
  ]);

  summaryData.push([]);
  summaryData.push(["KEHADIRAN PER HARI"]);

  if (dailyAttendance.length === 0) {
    summaryData.push(["Belum ada data kehadiran untuk trip ini."]);
  } else {
    summaryData.push([
      "Hari",
      "Tanggal",
      "Peserta hadir",
      "Total peserta",
      "Persentase kehadiran",
    ]);
    dailyAttendance.forEach((d) => {
      summaryData.push([d.day, d.date, d.count, d.total, `${d.percentage}%`]);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Lebar kolom biar rapi
  wsSummary["!cols"] = [
    { wch: 22 }, // A
    { wch: 25 }, // B
    { wch: 4 }, // C
    { wch: 22 }, // D
    { wch: 25 }, // E
  ];

  // Merge untuk judul & subjudul
  wsSummary["!merges"] = [
    // "LAPORAN PERJALANAN"
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    // nama trip
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    // "RINGKASAN TRIP"
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
    // "KEHADIRAN PER HARI"
    { s: { r: 8, c: 0 }, e: { r: 8, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan & Kehadiran");

  /* =========================
   *  SHEET 2: Top Agenda
   * ========================= */
  const agendaData: any[][] = [];

  agendaData.push(["TOP AGENDA PALING BANYAK DIKONFIRMASI"]);
  agendaData.push([trip.name]);
  agendaData.push([
    "Keterangan",
    "Daftar agenda dengan jumlah check-in terbanyak selama trip.",
  ]);
  agendaData.push([]);

  if (topAgenda.length === 0) {
    agendaData.push(["Belum ada agenda yang memiliki data check-in."]);
  } else {
    agendaData.push([
      "No",
      "Nama agenda",
      "Jumlah check-in",
      "Persentase terhadap total peserta",
    ]);

    topAgenda.forEach((a, idx) => {
      agendaData.push([idx + 1, a.title, a.checkins, `${a.percentage}%`]);
    });
  }

  const wsAgenda = XLSX.utils.aoa_to_sheet(agendaData);

  wsAgenda["!cols"] = [
    { wch: 6 }, // No
    { wch: 40 }, // Nama agenda
    { wch: 18 }, // Check-in
    { wch: 28 }, // Persentase
  ];

  wsAgenda["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // judul besar
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // nama trip
  ];

  XLSX.utils.book_append_sheet(wb, wsAgenda, "Top Agenda");

  /* =========================
   *  SHEET 3: Statistik Foto (opsional)
   * ========================= */
  if (photoStats.length > 0) {
    const totalUploaded = photoStats.reduce((s, x) => s + x.uploaded, 0);
    const totalApproved = photoStats.reduce((s, x) => s + x.approved, 0);
    const totalPending = photoStats.reduce((s, x) => s + x.pending, 0);
    const approvalRate =
      totalUploaded > 0 ? Math.round((totalApproved / totalUploaded) * 100) : 0;

    const photoData: any[][] = [];
    photoData.push(["STATISTIK FOTO PESERTA"]);
    photoData.push([trip.name]);
    photoData.push([
      "Ringkasan",
      `Total upload: ${totalUploaded}, Disetujui: ${totalApproved}, Menunggu: ${totalPending}, Tingkat persetujuan: ${approvalRate}%`,
    ]);
    photoData.push([]);

    photoData.push([
      "Periode",
      "Total upload",
      "Disetujui",
      "Menunggu",
      "Tingkat persetujuan",
    ]);

    photoStats.forEach((p) => {
      const percent =
        p.uploaded > 0
          ? `${Math.round((p.approved / p.uploaded) * 100)}%`
          : "0%";

      photoData.push([p.day, p.uploaded, p.approved, p.pending, percent]);
    });

    photoData.push([
      "Total",
      totalUploaded,
      totalApproved,
      totalPending,
      `${approvalRate}%`,
    ]);

    const wsPhoto = XLSX.utils.aoa_to_sheet(photoData);

    wsPhoto["!cols"] = [
      { wch: 30 }, // Periode
      { wch: 15 }, // Total upload
      { wch: 12 }, // Disetujui
      { wch: 12 }, // Menunggu
      { wch: 20 }, // Persentase
    ];

    wsPhoto["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // judul
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // nama trip
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // ringkasan
    ];

    XLSX.utils.book_append_sheet(wb, wsPhoto, "Statistik Foto");
  }

  // Tulis workbook jadi buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf as Buffer;
}

/* =========================
 *   PDF (pdf-lib)
 * ========================= */

async function getLogoBytesFromSettingOrPublic(
  baseUrl?: string
): Promise<{ bytes: Uint8Array | Buffer; isPng: boolean } | null> {
  // 1. Coba ambil dari setting (URL bisa absolute atau relative)
  try {
    const appSetting = await prisma.setting.findFirst({
      select: { logoUrl: true },
    });

    const rawUrl = appSetting?.logoUrl?.trim();
    if (rawUrl) {
      const isAbsolute = /^https?:\/\//i.test(rawUrl);

      const base =
        baseUrl ||
        process.env.NEXT_PUBLIC_APP_URL || // misal: https://tourguide.agilestore.id
        "";

      let finalUrl = rawUrl;
      if (!isAbsolute) {
        if (!base) {
          console.warn(
            "logoUrl relative tapi tidak ada baseUrl / NEXT_PUBLIC_APP_URL"
          );
        } else {
          const baseClean = base.replace(/\/$/, "");
          const pathClean = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
          finalUrl = baseClean + pathClean;
        }
      }

      if (finalUrl) {
        try {
          const res = await fetch(finalUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const lower = finalUrl.toLowerCase();
            const isPng =
              lower.endsWith(".png") ||
              res.headers.get("content-type") === "image/png";
            return { bytes, isPng };
          } else {
            console.warn("Gagal fetch logo dari URL setting:", res.status);
          }
        } catch (e) {
          console.warn("Error fetch logo dari URL setting:", e);
        }
      }
    }
  } catch (e) {
    console.warn("Gagal baca setting logo dari database:", e);
  }

  // 2. Fallback ke file di public
  const candidates = [
    { file: "logo-temanwisata.png", isPng: true },
    { file: "logo-temanwisata.jpg", isPng: false },
    { file: "logo-temanwisata.jpeg", isPng: false },
  ];

  for (const c of candidates) {
    try {
      const fullPath = path.join(process.cwd(), "public", c.file);
      if (fs.existsSync(fullPath)) {
        const bytes = await fs.promises.readFile(fullPath);
        return { bytes, isPng: c.isPng };
      }
    } catch (e) {
      console.warn("Gagal baca logo fallback:", e);
    }
  }

  return null;
}

async function buildPdfBuffer(
  report: Awaited<ReturnType<typeof buildReportData>>,
  baseUrl?: string
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
  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  const headerHeight = 80;

  // HEADER KOP
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: rgb(1, 1, 1),
  });

  // strip warna di bawah header
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: 3,
    color: rgb(0.08, 0.38, 0.8),
  });

  let titleStartX = marginX;

  // LOGO dari setting / fallback
  const logoInfo = await getLogoBytesFromSettingOrPublic(baseUrl);
  if (logoInfo) {
    try {
      const logoImage = logoInfo.isPng
        ? await pdfDoc.embedPng(logoInfo.bytes)
        : await pdfDoc.embedJpg(logoInfo.bytes);

      const maxLogoHeight = headerHeight - 24;
      const scale = maxLogoHeight / logoImage.height;
      const logoWidth = logoImage.width * scale;
      const logoHeight = logoImage.height * scale;

      const logoX = marginX;
      const logoY = height - headerHeight + (headerHeight - logoHeight) / 2;

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });

      titleStartX = logoX + logoWidth + 20;
    } catch (e) {
      console.warn("Gagal embed logo untuk PDF:", e);
    }
  }

  // Judul kop
  page.drawText("LAPORAN PERJALANAN", {
    x: titleStartX,
    y: height - 30,
    size: 16,
    font: fontBold,
    color: rgb(0.05, 0.07, 0.13),
  });

  page.drawText(trip.name, {
    x: titleStartX,
    y: height - 50,
    size: 11,
    font: fontRegular,
    color: rgb(0.1, 0.1, 0.1),
  });

  const nowText = new Date().toLocaleString("id-ID");
  page.drawText(`Tanggal ekspor: ${nowText}`, {
    x: width - marginX - 180,
    y: height - headerHeight - 18,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // BODY / SECTION
  let cursorY = height - headerHeight - 40;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < 60) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - 60;
    }
  };

  const drawSectionTitle = (text: string) => {
    ensureSpace(26);
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size: 13,
      font: fontBold,
      color: rgb(0.05, 0.07, 0.13),
    });
    page.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: 200,
      height: 1,
      color: rgb(0.75, 0.78, 0.82),
    });
    cursorY -= 22;
  };

  const writeLabelValue = (label: string, value: string) => {
    ensureSpace(16);
    const labelWidth = fontBold.widthOfTextAtSize(label, 10);
    page.drawText(label, {
      x: marginX,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(value, {
      x: marginX + labelWidth + 6,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 14;
  };

  // ---- Ringkasan Trip
  drawSectionTitle("Ringkasan Trip");
  writeLabelValue("Nama trip", trip.name);
  writeLabelValue("Total peserta", String(totalParticipants));
  writeLabelValue("Total agenda", String(totalSchedules));
  writeLabelValue("Total foto terunggah", String(totalPhotoUploaded));
  writeLabelValue(
    "Rata-rata kehadiran",
    avgAttendancePercent !== null ? `${avgAttendancePercent}%` : "-"
  );
  cursorY -= 10;

  // ---- Kehadiran per Hari
  drawSectionTitle("Kehadiran per Hari");

  if (dailyAttendance.length === 0) {
    ensureSpace(16);
    page.drawText("Belum ada data kehadiran untuk trip ini.", {
      x: marginX,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 16;
  } else {
    const colX = [
      marginX,
      marginX + 80,
      marginX + 220,
      marginX + 300,
      marginX + 360,
    ];

    const drawRow = (y: number, row: string[], header: boolean = false) => {
      row.forEach((cell, i) => {
        page.drawText(cell, {
          x: colX[i],
          y,
          size: 9,
          font: header ? fontBold : fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    };

    ensureSpace(20);
    drawRow(cursorY, ["Hari", "Tanggal", "Hadir", "Total", "%"], true);
    cursorY -= 14;

    dailyAttendance.forEach((d) => {
      ensureSpace(16);
      drawRow(cursorY, [
        d.day,
        d.date,
        String(d.count),
        String(d.total),
        `${d.percentage}%`,
      ]);
      cursorY -= 12;
    });
  }

  cursorY -= 10;

  // ---- Top Agenda
  drawSectionTitle("Top Agenda Paling Banyak Dikonfirmasi");

  if (topAgenda.length === 0) {
    ensureSpace(16);
    page.drawText("Belum ada agenda yang memiliki data check-in.", {
      x: marginX,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 16;
  } else {
    const colX2 = [marginX, marginX + 240, marginX + 360, marginX + 430];

    const drawRow2 = (y: number, row: string[], header: boolean = false) => {
      row.forEach((cell, i) => {
        page.drawText(cell, {
          x: colX2[i],
          y,
          size: 9,
          font: header ? fontBold : fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    };

    ensureSpace(20);
    drawRow2(cursorY, ["No", "Agenda", "Check-in", "% Peserta"], true);
    cursorY -= 14;

    topAgenda.forEach((a, idx) => {
      ensureSpace(16);
      const title =
        a.title.length > 60 ? a.title.slice(0, 57) + "..." : a.title;
      drawRow2(cursorY, [
        String(idx + 1),
        title,
        String(a.checkins),
        `${a.percentage}%`,
      ]);
      cursorY -= 12;
    });
  }

  // ---- Statistik Foto (jika ada)
  if (photoStats.length > 0) {
    cursorY -= 10;
    drawSectionTitle("Statistik Foto yang Diunggah Peserta");

    const totalUploaded = photoStats.reduce((s, x) => s + x.uploaded, 0);
    const totalApproved = photoStats.reduce((s, x) => s + x.approved, 0);
    const totalPending = photoStats.reduce((s, x) => s + x.pending, 0);
    const approvalRate =
      totalUploaded > 0 ? Math.round((totalApproved / totalUploaded) * 100) : 0;

    writeLabelValue(
      "Ringkasan",
      `Total upload: ${totalUploaded}, Disetujui: ${totalApproved}, Menunggu: ${totalPending}, Tingkat persetujuan: ${approvalRate}%`
    );
    cursorY -= 4;

    const colX3 = [
      marginX,
      marginX + 200,
      marginX + 280,
      marginX + 360,
      marginX + 430,
    ];

    const drawRow3 = (y: number, row: string[], header: boolean = false) => {
      row.forEach((cell, i) => {
        page.drawText(cell, {
          x: colX3[i],
          y,
          size: 8.5,
          font: header ? fontBold : fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
    };

    ensureSpace(20);
    drawRow3(
      cursorY,
      ["Periode", "Total upload", "Disetujui", "Menunggu", "%"],
      true
    );
    cursorY -= 12;

    photoStats.forEach((p) => {
      ensureSpace(14);
      const percent =
        p.uploaded > 0
          ? `${Math.round((p.approved / p.uploaded) * 100)}%`
          : `0%`;

      drawRow3(cursorY, [
        p.day,
        String(p.uploaded),
        String(p.approved),
        String(p.pending),
        percent,
      ]);
      cursorY -= 10;
    });

    ensureSpace(16);
    drawRow3(cursorY, [
      "Total",
      String(totalUploaded),
      String(totalApproved),
      String(totalPending),
      `${approvalRate}%`,
    ]);
    cursorY -= 12;
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
    const origin = url.origin; // untuk logo relative

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
      const buf = await buildPdfBuffer(report, origin);
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
