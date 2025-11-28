import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function formatDateRange(start: Date, end: Date) {
  const opt: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  const s = start.toLocaleDateString("id-ID", opt);
  const e = end.toLocaleDateString("id-ID", opt);
  return s === e ? s : `${s} - ${e}`;
}

function formatCheckedAt(dt: Date) {
  const d = dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const t = dt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${d}, ${t} WIB`;
}

// helper bikin URL absolut kalau imageUrl relatif (/uploads/...)
function toAbsoluteUrl(baseReq: Request, url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = new URL(baseReq.url).origin;
  if (!url.startsWith("/")) return `${origin}/${url}`;
  return `${origin}${url}`;
}

const DEFAULT_IMAGE = "/default-foto-story.png";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id?: string; tripId?: string }> }
) {
  try {
    const { id, tripId: tripIdFromParams } = await ctx.params;
    const tripId = tripIdFromParams ?? id;

    if (!tripId || tripId === "undefined") {
      return NextResponse.json(
        { ok: false, message: "tripId kosong" },
        { status: 400 }
      );
    }

    const session: any = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const [trip, setting] = await Promise.all([
      prisma.trip.findUnique({ where: { id: tripId } }),
      prisma.setting.findUnique({ where: { id: "GLOBAL_SETTING" } }),
    ]);

    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    const tripOnUser = session.trips?.find((t: any) => t.id === tripId);
    const participantId: string | null = tripOnUser?.participantId ?? null;

    if (!participantId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Anda tidak terdaftar sebagai peserta pada trip ini, story tidak tersedia",
        },
        { status: 403 }
      );
    }

    const [attendances, galleries] = await Promise.all([
      prisma.attendance.findMany({
        where: { tripId, participantId },
        include: { session: true },
        orderBy: { checkedAt: "asc" },
      }),
      prisma.gallery.findMany({
        where: { tripId, participantId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // map sessionId -> banyak foto (per sesi)
    const galleryBySessionId = new Map<string, string[]>();
    for (const g of galleries) {
      if (!g.sessionId) continue;
      if (!galleryBySessionId.has(g.sessionId)) {
        galleryBySessionId.set(g.sessionId, []);
      }
      galleryBySessionId.get(g.sessionId)!.push(g.imageUrl);
    }

    const moments = attendances.map((a) => {
      const s = a.session;
      const lat = s.locationLat ? s.locationLat.toString() : "";
      const lon = s.locationLon ? s.locationLon.toString() : "";
      const coordinates = lat && lon ? `${lat}, ${lon}` : "";
      const imageUrls = galleryBySessionId.get(a.sessionId) ?? [];

      const hasPhoto = imageUrls.length > 0;

      return {
        id: a.id,
        day: s.day,
        location: s.location,
        time: s.timeText,
        checkedInAt: formatCheckedAt(a.checkedAt),
        caption: s.title,
        coordinates,
        imageUrls: hasPhoto ? imageUrls : [DEFAULT_IMAGE], // kalau tidak ada pakai default
        hasPhoto,
      };
    });

    const uniqueSessionIds = new Set(attendances.map((a) => a.sessionId));
    const totalLocations = uniqueSessionIds.size;
    const totalPhotos = galleries.length;
    const totalCheckins = attendances.length;
    const badgesEarned =
      totalLocations === 0 ? 0 : Math.min(5, Math.ceil(totalLocations / 3));

    const tripSummary = {
      title: trip.name,
      dates: formatDateRange(trip.startDate, trip.endDate),
      participant: session.user?.name ?? "Peserta",
      totalLocations,
      totalPhotos,
      badgesEarned,
      totalCheckins,
    };

    // ====================== BUILD PDF ======================
    const pdf = await PDFDocument.create();
    let page = pdf.addPage();
    let { width, height } = page.getSize();
    const margin = 40;
    let y = height - margin;

    const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

    // cache image supaya tidak embed berkali-kali
    const imageCache = new Map<
      string,
      { type: "jpg" | "png"; ref: any; width: number; height: number }
    >();

    async function embedImage(url: string | null | undefined) {
      if (!url) return null;
      const abs = toAbsoluteUrl(req, url);
      if (!abs) return null;

      if (imageCache.has(abs)) return imageCache.get(abs)!;

      try {
        const res = await fetch(abs);
        if (!res.ok) {
          console.warn("Gagal fetch image:", abs, res.status);
          return null;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        const ct = res.headers.get("content-type") ?? "";

        if (ct.includes("png")) {
          const img = await pdf.embedPng(buf);
          const dims = img.scale(1);
          const item = {
            type: "png" as const,
            ref: img,
            width: dims.width,
            height: dims.height,
          };
          imageCache.set(abs, item);
          return item;
        } else {
          const img = await pdf.embedJpg(buf);
          const dims = img.scale(1);
          const item = {
            type: "jpg" as const,
            ref: img,
            width: dims.width,
            height: dims.height,
          };
          imageCache.set(abs, item);
          return item;
        }
      } catch (e) {
        console.warn("Gagal embed image story:", e);
        return null;
      }
    }

    function ensureSpace(needed: number) {
      if (y - needed < margin + 60) {
        // footer kecil di halaman sebelumnya
        page.drawLine({
          start: { x: margin, y: margin + 24 },
          end: { x: width - margin, y: margin + 24 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        // page.drawText("Trip Story • Teman Wisata", {
        page.drawText("Trip Story • AD Tour & Transport", {
          x: margin,
          y: margin + 10,
          size: 9,
          font: bodyFont,
          color: rgb(0.5, 0.5, 0.5),
        });

        page = pdf.addPage();
        ({ width, height } = page.getSize());
        y = height - margin;

        // header kecil di halaman lanjutan
        page.drawText("Lanjutan Trip Story", {
          x: margin,
          y,
          size: 12,
          font: titleFont,
          color: rgb(0.07, 0.34, 0.75),
        });
        y -= 24;
      }
    }

    // ====================== HEADER COVER ======================
    const headerHeight = 150;
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width,
      height: headerHeight,
      color: rgb(0.07, 0.34, 0.75),
    });

    // strip aksen
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width,
      height: 4,
      color: rgb(0.97, 0.73, 0.1), // kuning aksen
    });

    // logo (setting.logoUrl -> absolut, fallback /logo-temanwisata.png)
    let logoDrawn = false;
    const logoUrlAbs =
      toAbsoluteUrl(req, setting?.logoUrl) ??
      toAbsoluteUrl(req, "/logo-ad-tour-transparan.png");
      // toAbsoluteUrl(req, "/logo-temanwisata.png");

    if (logoUrlAbs) {
      try {
        const res = await fetch(logoUrlAbs);
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          const ct = res.headers.get("content-type") ?? "";
          const img =
            ct.includes("png") || logoUrlAbs.toLowerCase().endsWith(".png")
              ? await pdf.embedPng(buf)
              : await pdf.embedJpg(buf);

          const maxH = 64;
          const scale = maxH / img.height;
          const wLogo = img.width * scale;
          const hLogo = img.height * scale;

          page.drawImage(img, {
            x: margin,
            y: height - headerHeight + (headerHeight - hLogo) / 2,
            width: wLogo,
            height: hLogo,
          });
          logoDrawn = true;
        } else {
          console.warn("Gagal fetch logo story:", logoUrlAbs, res.status);
        }
      } catch (e) {
        console.warn("Gagal load logo PDF story:", e);
      }
    }

    const titleStartX = logoDrawn ? margin + 120 : margin;

    page.drawText("Trip Story", {
      x: titleStartX,
      y: height - 52,
      size: 14,
      font: bodyFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(tripSummary.title, {
      x: titleStartX,
      y: height - 75,
      size: 20,
      font: titleFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(tripSummary.dates, {
      x: titleStartX,
      y: height - 93,
      size: 11,
      font: bodyFont,
      color: rgb(0.9, 0.9, 0.9),
    });

    // tagline kecil
    // page.drawText("Kenangan perjalananmu bersama Teman Wisata.", {
    page.drawText("Kenangan perjalananmu bersama AD Tour & Transport.", {
      x: titleStartX,
      y: height - 110,
      size: 9,
      font: bodyFont,
      color: rgb(0.9, 0.9, 0.9),
    });

    // ====================== RINGKASAN PERJALANAN ======================
    y = height - headerHeight - 24;

    // background abu-abu muda
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: y + 10,
      color: rgb(0.97, 0.98, 0.99),
    });

    // card ringkasan
    const summaryCardHeight = 120;
    page.drawRectangle({
      x: margin - 4,
      y: y - summaryCardHeight + 8,
      width: width - margin * 2 + 8,
      height: summaryCardHeight,
      color: rgb(1, 1, 1),
    });

    page.drawText("Ringkasan Perjalanan Kamu", {
      x: margin,
      y: y - 12,
      size: 13,
      font: titleFont,
      color: rgb(0.07, 0.34, 0.75),
    });

    let sy = y - 30;
    page.drawText(`Peserta : ${tripSummary.participant}`, {
      x: margin,
      y: sy,
      size: 11,
      font: bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    sy -= 15;
    page.drawText(`Tanggal : ${tripSummary.dates}`, {
      x: margin,
      y: sy,
      size: 11,
      font: bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });

    // mini stat cards di sebelah kanan
    const statTopY = y - 22;
    const statW = 110;
    const statH = 30;
    const gapStat = 6;
    const statXBase = width - margin - statW;

    function drawStatBox(label: string, value: string, idx: number) {
      const boxY = statTopY - idx * (statH + gapStat);
      page.drawRectangle({
        x: statXBase,
        y: boxY,
        width: statW,
        height: statH,
        color: rgb(0.95, 0.97, 1),
      });
      page.drawText(label, {
        x: statXBase + 6,
        y: boxY + statH - 12,
        size: 7.5,
        font: bodyFont,
        color: rgb(0.25, 0.3, 0.45),
      });
      page.drawText(value, {
        x: statXBase + 6,
        y: boxY + 8,
        size: 10,
        font: titleFont,
        color: rgb(0.07, 0.34, 0.75),
      });
    }

    drawStatBox("Total Check-in", String(tripSummary.totalCheckins), 0);
    drawStatBox("Lokasi Dikunjungi", String(tripSummary.totalLocations), 1);
    drawStatBox("Foto Disetujui", String(tripSummary.totalPhotos), 2);

    y = y - summaryCardHeight - 10;

    // ====================== TIMELINE HIGHLIGHT ======================
    page.drawText("Highlight Perjalanan", {
      x: margin,
      y,
      size: 13,
      font: titleFont,
      color: rgb(0.07, 0.34, 0.75),
    });
    y -= 18;

    if (moments.length === 0) {
      page.drawText("Belum ada story yang terekam untuk perjalanan ini.", {
        x: margin,
        y,
        size: 11,
        font: bodyFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 16;
    } else {
      const lineH = 14;

      for (const m of moments) {
        const hasPhoto = m.imageUrls && m.imageUrls.length > 0;
        const thumbSize = 70; // kira² kotak 1:1
        const extraRightSpace = hasPhoto ? thumbSize + 20 : 0;
        const cardHeight = hasPhoto ? 100 : 80;

        // pastikan cukup space sebelum bikin kartu
        ensureSpace(cardHeight + 20);

        const cardTop = y;

        // background kartu
        page.drawRectangle({
          x: margin - 2,
          y: cardTop - cardHeight,
          width: width - margin * 2 + 4,
          height: cardHeight,
          color: rgb(1, 1, 1),
        });

        // strip kiri warna
        page.drawRectangle({
          x: margin - 2,
          y: cardTop - cardHeight,
          width: 4,
          height: cardHeight,
          color: rgb(0.07, 0.34, 0.75),
        });

        const textX = margin + 8;
        const textMaxX = width - margin - extraRightSpace;
        let cy = cardTop - 14;

        const mainColor = rgb(0.15, 0.15, 0.35);
        const subColor = rgb(0.35, 0.35, 0.35);
        const dimColor = rgb(0.45, 0.45, 0.45);

        // judul sesi
        page.drawText(`Hari ${m.day} • ${m.location}`, {
          x: textX,
          y: cy,
          size: 11,
          font: titleFont,
          color: mainColor,
        });
        cy -= lineH;

        page.drawText(`Waktu    : ${m.time}`, {
          x: textX,
          y: cy,
          size: 9.5,
          font: bodyFont,
          color: subColor,
        });
        cy -= lineH;

        page.drawText(`Check-in : ${m.checkedInAt}`, {
          x: textX,
          y: cy,
          size: 9.5,
          font: bodyFont,
          color: subColor,
        });
        cy -= lineH;

        page.drawText(`Agenda   : ${m.caption}`, {
          x: textX,
          y: cy,
          size: 9.5,
          font: bodyFont,
          color: rgb(0.25, 0.25, 0.25),
        });
        cy -= lineH;

        if (m.coordinates) {
          page.drawText(`Koordinat: ${m.coordinates}`, {
            x: textX,
            y: cy,
            size: 8.5,
            font: bodyFont,
            color: dimColor,
          });
          cy -= lineH;
        }

        if (!hasPhoto) {
          page.drawText("Belum ada foto di sesi ini.", {
            x: textX,
            y: cy,
            size: 8.5,
            font: bodyFont,
            color: rgb(0.7, 0.5, 0.2),
          });
        }

        // FOTO DI SEBELAH KANAN (maks 1 kotak 1:1)
        if (hasPhoto) {
          const firstUrl = m.imageUrls[0]; // cukup 1 foto utama
          const info = await embedImage(firstUrl);
          if (info) {
            // scale supaya MUAT di kotak thumbSize x thumbSize
            const scale = Math.min(
              thumbSize / info.width,
              thumbSize / info.height
            );
            const w = info.width * scale;
            const h = info.height * scale;

            // posisi kanan, center vertikal di dalam kartu
            const xPhoto = width - margin - w;
            const yPhoto = cardTop - (cardHeight + h) / 2 + 4;

            page.drawImage(info.ref, {
              x: xPhoto,
              y: yPhoto,
              width: w,
              height: h,
            });
          }
        }

        // garis pemisah antar kartu
        y = cardTop - cardHeight - 8;
        page.drawLine({
          start: { x: margin, y },
          end: { x: width - margin, y },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9),
        });
        y -= 10;
      }
    }

    // footer halaman terakhir
    page.drawLine({
      start: { x: margin, y: margin + 24 },
      end: { x: width - margin, y: margin + 24 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });

    // page.drawText("Trip Story • Teman Wisata", {
    page.drawText("Trip Story • AD Tour & Transport", {
      x: margin,
      y: margin + 10,
      size: 9,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="trip-story-${tripId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/trips/[id]/story-pdf error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
