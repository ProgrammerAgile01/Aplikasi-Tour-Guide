import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth"; // sesuaikan path-nya

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

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    // hanya ADMIN
    const session = await getSessionFromRequest(req);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = await resolveId(req, params);
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "id required" },
        { status: 400 }
      );
    }

    // cek dulu ada atau tidak
    const existing = await prisma.attendance.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Attendance not found" },
        { status: 404 }
      );
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/attendance/[id] error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
