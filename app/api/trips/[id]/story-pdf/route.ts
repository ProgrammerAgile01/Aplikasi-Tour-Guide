// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { getSessionFromRequest } from "@/lib/auth";
// import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// export const runtime = "nodejs";

// function formatDateRange(start: Date, end: Date) {
//   const opt: Intl.DateTimeFormatOptions = {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   };
//   const s = start.toLocaleDateString("id-ID", opt);
//   const e = end.toLocaleDateString("id-ID", opt);
//   return s === e ? s : `${s} - ${e}`;
// }

// function formatCheckedAt(dt: Date) {
//   const d = dt.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
//   const t = dt.toLocaleTimeString("id-ID", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
//   return `${d}, ${t} WIB`;
// }

// // helper bikin URL absolut kalau imageUrl relatif (/uploads/...)
// function toAbsoluteUrl(baseReq: Request, url: string) {
//   if (!url) return null;
//   if (url.startsWith("http://") || url.startsWith("https://")) return url;
//   const origin = new URL(baseReq.url).origin;
//   if (!url.startsWith("/")) return `${origin}/${url}`;
//   return `${origin}${url}`;
// }

// export async function GET(
//   req: Request,
//   ctx: { params: Promise<{ id?: string; tripId?: string }> }
// ) {
//   try {
//     const { id, tripId: tripIdFromParams } = await ctx.params;
//     const tripId = tripIdFromParams ?? id;

//     if (!tripId || tripId === "undefined") {
//       return NextResponse.json(
//         { ok: false, message: "tripId kosong" },
//         { status: 400 }
//       );
//     }

//     const session = getSessionFromRequest(req);
//     if (!session) {
//       return NextResponse.json(
//         { ok: false, message: "Not authenticated" },
//         { status: 401 }
//       );
//     }

//     const [trip, setting] = await Promise.all([
//       prisma.trip.findUnique({ where: { id: tripId } }),
//       prisma.setting.findUnique({ where: { id: "GLOBAL" } }),
//     ]);

//     if (!trip) {
//       return NextResponse.json(
//         { ok: false, message: "Trip tidak ditemukan" },
//         { status: 404 }
//       );
//     }

//     const tripOnUser = session.trips?.find((t: any) => t.id === tripId);
//     const participantId: string | null = tripOnUser?.participantId ?? null;

//     if (!participantId) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message:
//             "Anda tidak terdaftar sebagai peserta pada trip ini, story tidak tersedia",
//         },
//         { status: 403 }
//       );
//     }

//     const [attendances, galleries] = await Promise.all([
//       prisma.attendance.findMany({
//         where: { tripId, participantId },
//         include: { session: true },
//         orderBy: { checkedAt: "asc" },
//       }),
//       prisma.gallery.findMany({
//         where: { tripId, participantId, status: "APPROVED" },
//         orderBy: { createdAt: "asc" },
//       }),
//     ]);

//     // map sessionId -> 1 foto (thumbnail)
//     const galleryBySessionId = new Map<string, string>();
//     for (const g of galleries) {
//       if (!galleryBySessionId.has(g.sessionId)) {
//         galleryBySessionId.set(g.sessionId, g.imageUrl);
//       }
//     }

//     const moments = attendances.map((a) => {
//       const s = a.session;
//       const lat = s.locationLat ? s.locationLat.toString() : "";
//       const lon = s.locationLon ? s.locationLon.toString() : "";
//       const coordinates = lat && lon ? `${lat}, ${lon}` : "";
//       const imageUrl = galleryBySessionId.get(a.sessionId) ?? null;

//       return {
//         id: a.id,
//         day: s.day,
//         location: s.location,
//         time: s.timeText,
//         checkedInAt: formatCheckedAt(a.checkedAt),
//         caption: s.title,
//         coordinates,
//         imageUrl,
//       };
//     });

//     const uniqueSessionIds = new Set(attendances.map((a) => a.sessionId));
//     const totalLocations = uniqueSessionIds.size;
//     const totalPhotos = galleries.length;
//     const badgesEarned =
//       totalLocations === 0 ? 0 : Math.min(5, Math.ceil(totalLocations / 3));

//     const tripSummary = {
//       title: trip.name,
//       dates: formatDateRange(trip.startDate, trip.endDate),
//       participant: session.user?.name ?? "Peserta",
//       totalLocations,
//       totalPhotos,
//       badgesEarned,
//     };

//     // ====================== BUILD PDF ======================
//     const pdf = await PDFDocument.create();
//     let page = pdf.addPage();
//     const { width, height } = page.getSize();
//     const margin = 40;
//     let y = height - margin;

//     const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
//     const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

//     // cache image supaya tidak embed berkali-kali
//     const imageCache = new Map<
//       string,
//       { type: "jpg" | "png"; ref: any; width: number; height: number }
//     >();

//     async function embedImage(url: string | null) {
//       if (!url) return null;
//       const abs = toAbsoluteUrl(req, url);
//       if (!abs) return null;

//       if (imageCache.has(abs)) return imageCache.get(abs)!;

//       try {
//         const res = await fetch(abs);
//         if (!res.ok) return null;
//         const buf = new Uint8Array(await res.arrayBuffer());
//         const ct = res.headers.get("content-type") ?? "";

//         if (ct.includes("png")) {
//           const img = await pdf.embedPng(buf);
//           const dims = img.scale(1);
//           const item = {
//             type: "png" as const,
//             ref: img,
//             width: dims.width,
//             height: dims.height,
//           };
//           imageCache.set(abs, item);
//           return item;
//         } else {
//           const img = await pdf.embedJpg(buf);
//           const dims = img.scale(1);
//           const item = {
//             type: "jpg" as const,
//             ref: img,
//             width: dims.width,
//             height: dims.height,
//           };
//           imageCache.set(abs, item);
//           return item;
//         }
//       } catch (e) {
//         console.warn("Gagal embed image story:", e);
//         return null;
//       }
//     }

//     function newPage() {
//       page = pdf.addPage();
//       y = height - margin;
//       page.drawText("Lanjutan Story", {
//         x: margin,
//         y,
//         size: 12,
//         font: titleFont,
//         color: rgb(0.07, 0.34, 0.75),
//       });
//       y -= 24;
//     }

//     // header biru
//     page.drawRectangle({
//       x: 0,
//       y: height - 130,
//       width,
//       height: 130,
//       color: rgb(0.07, 0.34, 0.75),
//     });

//     // logo
//     if (setting?.logoUrl) {
//       try {
//         const logoRes = await fetch(setting.logoUrl);
//         const arr = new Uint8Array(await logoRes.arrayBuffer());
//         const ct = logoRes.headers.get("content-type") ?? "image/png";

//         const img = ct.includes("png")
//           ? await pdf.embedPng(arr)
//           : await pdf.embedJpg(arr);

//         const dims = img.scale(0.25);
//         page.drawImage(img, {
//           x: margin,
//           y: height - 40 - dims.height,
//           width: dims.width,
//           height: dims.height,
//         });
//       } catch (e) {
//         console.warn("Gagal load logo PDF:", e);
//       }
//     }

//     page.drawText("Trip Story", {
//       x: margin,
//       y: height - 50,
//       size: 14,
//       font: bodyFont,
//       color: rgb(1, 1, 1),
//     });

//     page.drawText(tripSummary.title, {
//       x: margin,
//       y: height - 70,
//       size: 20,
//       font: titleFont,
//       color: rgb(1, 1, 1),
//     });

//     // ringkasan
//     y = height - 150;
//     page.drawText(`Peserta : ${tripSummary.participant}`, {
//       x: margin,
//       y,
//       size: 11,
//       font: bodyFont,
//       color: rgb(0.15, 0.15, 0.15),
//     });
//     y -= 16;
//     page.drawText(`Tanggal : ${tripSummary.dates}`, {
//       x: margin,
//       y,
//       size: 11,
//       font: bodyFont,
//       color: rgb(0.15, 0.15, 0.15),
//     });
//     y -= 16;
//     page.drawText(
//       `Lokasi: ${tripSummary.totalLocations}  •  Foto: ${tripSummary.totalPhotos}  •  Badge: ${tripSummary.badgesEarned}`,
//       {
//         x: margin,
//         y,
//         size: 11,
//         font: bodyFont,
//         color: rgb(0.2, 0.2, 0.2),
//       }
//     );
//     y -= 24;

//     page.drawLine({
//       start: { x: margin, y },
//       end: { x: width - margin, y },
//       thickness: 1,
//       color: rgb(0.8, 0.8, 0.8),
//     });
//     y -= 20;

//     page.drawText("Highlight Perjalanan", {
//       x: margin,
//       y,
//       size: 13,
//       font: titleFont,
//       color: rgb(0.07, 0.34, 0.75),
//     });
//     y -= 20;

//     const lineH = 14;

//     if (moments.length === 0) {
//       page.drawText("Belum ada story yang terekam untuk perjalanan ini.", {
//         x: margin,
//         y,
//         size: 11,
//         font: bodyFont,
//         color: rgb(0.4, 0.4, 0.4),
//       });
//     } else {
//       for (const m of moments) {
//         // cek space, kalau mepet turun halaman
//         if (y < margin + 120) newPage();

//         // judul
//         page.drawText(`Hari ${m.day} • ${m.location}`, {
//           x: margin,
//           y,
//           size: 11,
//           font: titleFont,
//           color: rgb(0.15, 0.15, 0.15),
//         });
//         y -= lineH;

//         page.drawText(`Waktu: ${m.time}`, {
//           x: margin,
//           y,
//           size: 10,
//           font: bodyFont,
//           color: rgb(0.3, 0.3, 0.3),
//         });
//         y -= lineH;

//         page.drawText(`Check-in: ${m.checkedInAt}`, {
//           x: margin,
//           y,
//           size: 10,
//           font: bodyFont,
//           color: rgb(0.3, 0.3, 0.3),
//         });
//         y -= lineH;

//         page.drawText(`Catatan: ${m.caption}`, {
//           x: margin,
//           y,
//           size: 10,
//           font: bodyFont,
//           color: rgb(0.25, 0.25, 0.25),
//         });
//         y -= lineH;

//         if (m.coordinates) {
//           page.drawText(`Koordinat: ${m.coordinates}`, {
//             x: margin,
//             y,
//             size: 9,
//             font: bodyFont,
//             color: rgb(0.4, 0.4, 0.4),
//           });
//           y -= lineH;
//         }

//         // FOTO (kecil) kalau ada
//         if (m.imageUrl) {
//           const imgInfo = await embedImage(m.imageUrl);
//           if (imgInfo) {
//             const maxWidth = 160;
//             const scale = maxWidth / imgInfo.width;
//             const w = imgInfo.width * scale;
//             const h = imgInfo.height * scale;

//             // kalau tidak cukup space lagi, pindah halaman
//             if (y - h - 10 < margin) newPage();

//             page.drawImage(imgInfo.ref, {
//               x: margin,
//               y: y - h,
//               width: w,
//               height: h,
//             });

//             y -= h + 6;
//           }
//         }

//         y -= 8;
//       }
//     }

//     // footer
//     page.drawLine({
//       start: { x: margin, y: margin + 24 },
//       end: { x: width - margin, y: margin + 24 },
//       thickness: 0.5,
//       color: rgb(0.85, 0.85, 0.85),
//     });

//     page.drawText("Powered by Agile", {
//       x: margin,
//       y: margin + 10,
//       size: 9,
//       font: bodyFont,
//       color: rgb(0.5, 0.5, 0.5),
//     });

//     const pdfBytes = await pdf.save();

//     return new NextResponse(Buffer.from(pdfBytes), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": `attachment; filename="trip-story-${tripId}.pdf"`,
//       },
//     });
//   } catch (err: any) {
//     console.error("GET /api/trips/[id]/story-pdf error:", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

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
        where: { tripId, participantId, status: "APPROVED", deletedAt: null },
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

      return {
        id: a.id,
        day: s.day,
        location: s.location,
        time: s.timeText,
        checkedInAt: formatCheckedAt(a.checkedAt),
        caption: s.title,
        coordinates,
        imageUrls,
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
      if (y - needed < margin + 40) {
        // footer kecil di halaman sebelumnya
        page.drawLine({
          start: { x: margin, y: margin + 24 },
          end: { x: width - margin, y: margin + 24 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        page.drawText("Trip Story • Teman Wisata", {
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
    const headerHeight = 140;
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
      toAbsoluteUrl(req, "/logo-temanwisata.png");

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

          const maxH = 60;
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
      y: height - 50,
      size: 14,
      font: bodyFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(tripSummary.title, {
      x: titleStartX,
      y: height - 70,
      size: 20,
      font: titleFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(tripSummary.dates, {
      x: titleStartX,
      y: height - 88,
      size: 11,
      font: bodyFont,
      color: rgb(0.9, 0.9, 0.9),
    });

    // ====================== RINGKASAN PERJALANAN ======================
    y = height - headerHeight - 30;

    page.drawText("Ringkasan Perjalanan Kamu", {
      x: margin,
      y,
      size: 13,
      font: titleFont,
      color: rgb(0.07, 0.34, 0.75),
    });
    y -= 20;

    page.drawText(`Peserta : ${tripSummary.participant}`, {
      x: margin,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 16;

    page.drawText(`Tanggal : ${tripSummary.dates}`, {
      x: margin,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 18;

    page.drawText(`Total check-in       : ${tripSummary.totalCheckins}`, {
      x: margin,
      y,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;

    page.drawText(`Lokasi dikunjungi    : ${tripSummary.totalLocations}`, {
      x: margin,
      y,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;

    page.drawText(`Foto yang disetujui  : ${tripSummary.totalPhotos}`, {
      x: margin,
      y,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;

    page.drawText(`Badge yang kamu raih : ${tripSummary.badgesEarned}`, {
      x: margin,
      y,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 24;

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
        // estimasi tinggi 1 blok (tanpa foto) ± 5 baris teks
        ensureSpace(5 * lineH + 80);

        // judul sesi
        page.drawText(`Hari ${m.day} • ${m.location}`, {
          x: margin,
          y,
          size: 11,
          font: titleFont,
          color: rgb(0.15, 0.15, 0.35),
        });
        y -= lineH;

        page.drawText(`Waktu    : ${m.time}`, {
          x: margin,
          y,
          size: 10,
          font: bodyFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= lineH;

        page.drawText(`Check-in : ${m.checkedInAt}`, {
          x: margin,
          y,
          size: 10,
          font: bodyFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= lineH;

        page.drawText(`Agenda   : ${m.caption}`, {
          x: margin,
          y,
          size: 10,
          font: bodyFont,
          color: rgb(0.25, 0.25, 0.25),
        });
        y -= lineH;

        if (m.coordinates) {
          page.drawText(`Koordinat: ${m.coordinates}`, {
            x: margin,
            y,
            size: 9,
            font: bodyFont,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= lineH;
        }

        // FOTO-FOTO (max 3 per sesi, sejajar seperti thumbnail)
        if (m.imageUrls && m.imageUrls.length > 0) {
          const photosToShow = m.imageUrls.slice(0, 3);
          const thumbMaxWidth = 90;
          const gap = 8;

          const embedded: {
            w: number;
            h: number;
            ref: any;
          }[] = [];

          for (const url of photosToShow) {
            const info = await embedImage(url);
            if (!info) continue;
            const scale = thumbMaxWidth / info.width;
            const w = info.width * scale;
            const h = info.height * scale;
            embedded.push({ w, h, ref: info.ref });
          }

          if (embedded.length > 0) {
            const rowHeight = Math.max(...embedded.map((e) => e.h));
            ensureSpace(rowHeight + 20);

            let xPos = margin;
            const yPhoto = y - rowHeight;

            for (const e of embedded) {
              if (xPos + e.w > width - margin) break;
              page.drawImage(e.ref, {
                x: xPos,
                y: yPhoto,
                width: e.w,
                height: e.h,
              });
              xPos += e.w + gap;
            }

            y -= rowHeight + 6;
          }
        }

        // garis pemisah antar moment
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

    page.drawText("Trip Story • Teman Wisata", {
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
