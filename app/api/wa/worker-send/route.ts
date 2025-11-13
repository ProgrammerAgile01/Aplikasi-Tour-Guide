import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WA_SERVICE_URL = process.env.WA_SERVICE_URL || "http://localhost:4003";
const WA_API_KEY = process.env.WA_API_KEY || "";

const BATCH_SIZE = 20; // biar aman, kirim 20 per run

function normalizePhone(raw: string) {
  let phone = (raw || "").replace(/\D/g, "");
  if (!phone) return null;
  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  }
  return phone;
}

export async function POST() {
  if (!WA_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "WA_API_KEY belum di-set" },
      { status: 500 }
    );
  }

  // 1. Ambil PENDING
  const pending = await prisma.whatsAppMessage.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Tidak ada pesan PENDING",
      processed: 0,
    });
  }

  const ids = pending.map((m) => m.id);

  // 2. Tandai SENDING dulu (anti double worker)
  await prisma.whatsAppMessage.updateMany({
    where: { id: { in: ids } },
    data: { status: "SENDING" },
  });

  let success = 0;
  let failed = 0;

  for (const msg of pending) {
    const phone = normalizePhone(msg.to);

    if (!phone) {
      failed++;
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          status: "FAILED",
          error: "Nomor WhatsApp tidak valid",
        },
      });
      continue;
    }

    try {
      const resp = await fetch(`${WA_SERVICE_URL}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": WA_API_KEY,
        },
        body: JSON.stringify({
          to: phone,
          message: msg.content,
        }),
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok || !json?.ok) {
        failed++;
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: {
            status: "FAILED",
            error:
              json?.message || `HTTP ${resp.status}: Gagal dari wa-service`,
          },
        });
        continue;
      }

      success++;
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          status: "SUCCESS",
          sentAt: new Date(),
          error: null,
        },
      });
    } catch (err: any) {
      failed++;
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          status: "FAILED",
          error: String(err?.message || err),
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Batch WA diproses",
    batchSize: pending.length,
    success,
    failed,
  });
}
