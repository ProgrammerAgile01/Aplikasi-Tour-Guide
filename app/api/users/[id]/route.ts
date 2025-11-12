import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function resolveId(req: Request, params: any) {
  try {
    let resolved = params;
    if (params && typeof params.then === "function") resolved = await params;
    const idFromParams = resolved && (resolved.id ?? resolved["0"]);
    if (idFromParams) return idFromParams;
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
}

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    const item = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        whatsapp: true,
        role: true,
        isActive: true,
        createdAt: true,
        userTrips: {
          select: {
            roleOnTrip: true,
            trip: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!item)
      return NextResponse.json(
        { ok: false, message: "User not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    console.error("GET /api/users/[id] error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    const json = await req.json();
    const data = UpdateUserSchema.parse(json);

    const updated = await prisma.user.update({ where: { id }, data });

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        whatsapp: updated.whatsapp,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (err: any) {
    console.error("PUT /api/users/[id] error", err);
    if (err?.name === "ZodError")
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const id = await resolveId(req, params);
    if (!id)
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/users/[id] error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
