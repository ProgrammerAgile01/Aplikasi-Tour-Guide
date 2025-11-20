import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where: any = { deletedAt: null };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        whatsapp: true,
        role: true,
        isActive: true,
        createdAt: true,
        userTrips: {
          select: {
            roleOnTrip: true,
            trip: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.user.count({ where });

    return NextResponse.json({ ok: true, total, items });
  } catch (err: any) {
    console.error("GET /api/users error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
