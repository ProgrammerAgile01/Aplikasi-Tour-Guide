// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import prisma from "@/lib/prisma";
// import { parseCookies, verifyToken } from "@/lib/auth";

// const JWT = process.env.JWT_SECRET || "dev-secret";
// const TOKEN_TTL_SECONDS = 60; // QR rotate tiap 60 detik

// export async function POST(req: Request) {
//   try {
//     const cookieHeader = req.headers.get("cookie") || "";
//     const cookies = parseCookies(cookieHeader);
//     const token = cookies["token"];
//     const payload = verifyToken(token);

//     if (!payload) {
//       return NextResponse.json(
//         { ok: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }
//     const role = String(payload.user?.role ?? "").toUpperCase();
//     if (role !== "ADMIN") {
//       return NextResponse.json(
//         { ok: false, message: "Forbidden" },
//         { status: 403 }
//       );
//     }

//     const body = await req.json().catch(() => ({}));
//     const { tripId, sessionId } = body as {
//       tripId?: string;
//       sessionId?: string;
//     };
//     if (!tripId || !sessionId) {
//       return NextResponse.json(
//         { ok: false, message: "tripId & sessionId required" },
//         { status: 400 }
//       );
//     }

//     // validasi sesi milik trip
//     const schedule = await prisma.schedule.findUnique({
//       where: { id: sessionId },
//     });
//     if (!schedule || schedule.tripId !== tripId) {
//       return NextResponse.json(
//         { ok: false, message: "Invalid session/trip" },
//         { status: 400 }
//       );
//     }

//     const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
//     const qrToken = jwt.sign({ typ: "qr-checkin", tripId, sessionId }, JWT, {
//       expiresIn: TOKEN_TTL_SECONDS,
//     });

//     const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010";
//     const qrUrl = `${base}/trip/${encodeURIComponent(
//       tripId
//     )}/session/${encodeURIComponent(sessionId)}/scan?token=${encodeURIComponent(
//       qrToken
//     )}`;

//     return NextResponse.json({
//       ok: true,
//       data: {
//         token: qrToken,
//         qrUrl,
//         expiresAt: new Date(exp * 1000).toISOString(),
//       },
//     });
//   } catch (e: any) {
//     return NextResponse.json(
//       { ok: false, message: e?.message ?? "Internal Error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

const JWT = process.env.JWT_SECRET || "dev-secret";
const TOKEN_TTL_SECONDS = 60; // QR rotate tiap 60 detik

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["token"];
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
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

    const body = await req.json().catch(() => ({}));
    const { tripId, sessionId } = body as {
      tripId?: string;
      sessionId?: string;
    };
    if (!tripId || !sessionId) {
      return NextResponse.json(
        { ok: false, message: "tripId & sessionId required" },
        { status: 400 }
      );
    }

    // validasi sesi milik trip
    const schedule = await prisma.schedule.findUnique({
      where: { id: sessionId },
    });
    if (!schedule || schedule.tripId !== tripId) {
      return NextResponse.json(
        { ok: false, message: "Invalid session/trip" },
        { status: 400 }
      );
    }

    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

    // token yang akan disimpan di QR
    const qrToken = jwt.sign({ typ: "qr-checkin", tripId, sessionId }, JWT, {
      expiresIn: TOKEN_TTL_SECONDS,
    });

    // 📌 Perhatikan:
    // Sekarang isi QR = token langsung, bukan URL.
    // Peserta akan scan dengan kamera di dalam app lalu
    // dikirim ke /api/checkins/qr/confirm.
    const qrPayload = qrToken;

    return NextResponse.json({
      ok: true,
      data: {
        token: qrToken,
        qrPayload,
        expiresAt: new Date(exp * 1000).toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
