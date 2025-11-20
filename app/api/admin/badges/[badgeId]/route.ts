import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const BadgeBody = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  conditionType: z
    .enum([
      "CHECKIN_SESSION",
      "GALLERY_UPLOAD_SESSION",
      "COMPLETE_ALL_SESSIONS",
    ])
    .optional(),
  targetValue: z.coerce.number().int().min(1).optional().nullable(),
  sessionId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

function ensureAdmin(payload: any) {
  if (!payload?.user || payload.user.role === "PESERTA") {
    throw new Error("Forbidden");
  }
}

// ✅ PUT /api/admin/badges/[badgeId]
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ badgeId?: string }> }
) {
  try {
    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    ensureAdmin(payload);

    // ⬇️ PARAMS HARUS DI-AWAIT
    const { badgeId } = await ctx.params;
    if (!badgeId) {
      return NextResponse.json(
        { ok: false, message: "badgeId required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = BadgeBody.parse(body);

    const def = await prisma.badgeDefinition.update({
      where: { id: badgeId },
      data: {
        // hanya field yg dikirim yang di-update
        ...(parsed.code !== undefined && { code: parsed.code }),
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.description !== undefined && {
          description: parsed.description,
        }),
        ...(parsed.icon !== undefined && { icon: parsed.icon }),
        // location boleh null → pakai null, bukan undefined
        ...(parsed.location !== undefined && { location: parsed.location }),
        ...(parsed.conditionType !== undefined && {
          conditionType: parsed.conditionType as any,
        }),
        ...(parsed.targetValue !== undefined && {
          targetValue: parsed.targetValue,
        }),
        ...(parsed.sessionId !== undefined && {
          sessionId: parsed.sessionId,
        }),
        ...(parsed.isActive !== undefined && {
          isActive: parsed.isActive,
        }),
      },
    });

    return NextResponse.json({ ok: true, item: def });
  } catch (e: any) {
    if (e.message === "Forbidden") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("PUT /api/admin/badges/[badgeId] error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE /api/admin/badges/[badgeId]
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ badgeId?: string }> }
) {
  try {
    const payload = getSessionFromRequest(req) as any;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    ensureAdmin(payload);

    const { badgeId } = await ctx.params;
    if (!badgeId) {
      return NextResponse.json(
        { ok: false, message: "badgeId required" },
        { status: 400 }
      );
    }

    // await prisma.participantBadge.updateMany({
    //   where: { badgeId },
    //   data: {
    //     deletedAt: new Date(),
    //   }
    // });
    await prisma.badgeDefinition.update({
      where: { id: badgeId },
      data: {
        deletedAt: new Date(),
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Forbidden") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    console.error("DELETE /api/admin/badges/[badgeId] error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
