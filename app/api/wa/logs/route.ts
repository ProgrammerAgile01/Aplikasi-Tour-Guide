import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // PENDING, SUCCESS, FAILED, SENDING
    const q = url.searchParams.get("q")?.trim();

    const rawTake = Number(url.searchParams.get("take") || "25");
    const take = Math.min(rawTake, 25); // batasi max 25

    const rawPage = Number(url.searchParams.get("page") || "1");
    const page = rawPage > 0 ? rawPage : 1;
    const skip = (page - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { to: { contains: q } },
        { template: { contains: q } },
        {
          participant: {
            name: { contains: q },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          participant: true,
          trip: true,
        },
      }),
      prisma.whatsAppMessage.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    });
  } catch (err: any) {
    console.error("WA logs error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat log WhatsApp" },
      { status: 500 }
    );
  }
}
