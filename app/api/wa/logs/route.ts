import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // PENDING, SUCCESS, FAILED, SENDING
    const q = url.searchParams.get("q")?.trim();
    const take = Number(url.searchParams.get("take") || "50");

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

    const items = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
      include: {
        participant: true,
        trip: true,
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("WA logs error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memuat log WhatsApp" },
      { status: 500 }
    );
  }
}
