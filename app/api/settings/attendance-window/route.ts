import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

const GLOBAL_SETTING_ID = "GLOBAL_SETTING";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    let setting = await prisma.setting.findUnique({
      where: { id: GLOBAL_SETTING_ID },
      select: {
        attendanceGraceMinutes: true,
      },
    });

    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          id: GLOBAL_SETTING_ID,
          attendanceGraceMinutes: 15,
        },
        select: {
          attendanceGraceMinutes: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        grace: setting.attendanceGraceMinutes ?? 15,
      },
    });
  } catch (err: any) {
    console.error("GET attendance-window error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    let grace = Number.parseInt(body?.grace ?? "15", 10);

    if (Number.isNaN(grace)) grace = 15;
    if (grace < 0) grace = 0;
    if (grace > 120) grace = 120;

    const setting = await prisma.setting.upsert({
      where: { id: GLOBAL_SETTING_ID },
      create: {
        id: GLOBAL_SETTING_ID,
        attendanceGraceMinutes: grace,
      },
      update: {
        attendanceGraceMinutes: grace,
      },
      select: {
        attendanceGraceMinutes: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { grace: setting.attendanceGraceMinutes },
    });
  } catch (err: any) {
    console.error("POST attendance-window error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
