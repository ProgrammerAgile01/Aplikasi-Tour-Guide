import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseCookies, verifyToken } from "@/lib/auth";

const GLOBAL_SETTING_ID = "GLOBAL_SETTING";

const DEFAULT_REMINDER_RADIUS = 1000; // 1 km
const DEFAULT_ATTENDANCE_RADIUS = 200; // 200 m

// GET: ambil radius global
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { id: GLOBAL_SETTING_ID },
      select: {
        geoReminderRadiusMeters: true,
        geoAttendanceRadiusMeters: true,
      },
    });

    const reminder =
      setting?.geoReminderRadiusMeters && setting.geoReminderRadiusMeters > 0
        ? setting.geoReminderRadiusMeters
        : DEFAULT_REMINDER_RADIUS;

    const attendance =
      setting?.geoAttendanceRadiusMeters &&
      setting.geoAttendanceRadiusMeters > 0
        ? setting.geoAttendanceRadiusMeters
        : DEFAULT_ATTENDANCE_RADIUS;

    return NextResponse.json({
      ok: true,
      data: {
        geoReminderRadiusMeters: reminder,
        geoAttendanceRadiusMeters: attendance,
      },
    });
  } catch (e: any) {
    console.error("GET /api/admin/geo-radius error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

// POST: update radius global
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["token"];
    const auth = verifyToken(sessionToken);

    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // kalau mau, di sini bisa cek auth.user.role === "ADMIN"

    const body = await req.json().catch(() => ({}));
    const { geoReminderRadiusMeters, geoAttendanceRadiusMeters } = body as {
      geoReminderRadiusMeters?: number;
      geoAttendanceRadiusMeters?: number;
    };

    const dataToUpdate: any = {};

    if (
      typeof geoReminderRadiusMeters === "number" &&
      geoReminderRadiusMeters > 0
    ) {
      dataToUpdate.geoReminderRadiusMeters = Math.round(
        geoReminderRadiusMeters
      );
    }

    if (
      typeof geoAttendanceRadiusMeters === "number" &&
      geoAttendanceRadiusMeters > 0
    ) {
      dataToUpdate.geoAttendanceRadiusMeters = Math.round(
        geoAttendanceRadiusMeters
      );
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada data radius yang dikirim" },
        { status: 400 }
      );
    }

    const updated = await prisma.setting.upsert({
      where: { id: GLOBAL_SETTING_ID },
      update: dataToUpdate,
      create: {
        id: GLOBAL_SETTING_ID,
        logoUrl: null,
        tripName: null,
        description: null,
        ...dataToUpdate,
      },
      select: {
        geoReminderRadiusMeters: true,
        geoAttendanceRadiusMeters: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Pengaturan radius global berhasil disimpan",
      data: updated,
    });
  } catch (e: any) {
    console.error("POST /api/admin/geo-radius error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
