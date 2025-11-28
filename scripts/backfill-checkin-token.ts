// scripts/backfill-checkin-token.ts
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateCheckinToken() {
  // 32 char hex random, cukup kuat & susah ditebak
  return crypto.randomBytes(16).toString("hex");
}

async function main() {
  console.log("=== Backfill checkinToken untuk Participant ===");

  // ambil semua participant yang checkinTokennya masih null
  const participants = await prisma.participant.findMany({
    where: {
      checkinToken: null,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(
    `Ditemukan ${participants.length} peserta yang belum punya checkinToken.`
  );

  let processed = 0;

  for (const p of participants) {
    const token = generateCheckinToken();

    await prisma.participant.update({
      where: { id: p.id },
      data: { checkinToken: token },
    });

    processed++;
    if (processed % 50 === 0) {
      console.log(`  -> ${processed} peserta ter-update...`);
    }
  }

  console.log(`Selesai. Total peserta ter-update: ${processed}`);
}

main()
  .catch((e) => {
    console.error("Error saat backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
