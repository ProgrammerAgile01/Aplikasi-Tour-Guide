import prisma from "@/lib/prisma";
import crypto from "crypto";

const MAGIC_LINK_LIFETIME_DAYS = 30; // 1 bulan

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// generate token random yang susah ditebak
export function generateMagicToken() {
  return crypto.randomBytes(32).toString("hex"); // 64-char hex
}

/**
 * Dapatkan magic link untuk user+participant+trip.
 * - Kalau masih ada token yang belum expired → pakai ulang
 * - Kalau sudah tidak ada / expired → buat baru
 */
export async function getOrCreateMagicLink(params: {
  userId: string;
  participantId?: string | null;
  tripId?: string | null;
  baseUrl: string; // contoh: https://temanwisata.com
}) {
  const { userId, participantId, tripId, baseUrl } = params;

  const now = new Date();

  // cari token aktif (belum expired)
  const existing = await prisma.magicLoginToken.findFirst({
    where: {
      userId,
      participantId: participantId ?? undefined,
      tripId: tripId ?? undefined,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  const token =
    existing?.token ??
    (await (async () => {
      const raw = generateMagicToken();
      const expiresAt = addDays(now, MAGIC_LINK_LIFETIME_DAYS);

      const created = await prisma.magicLoginToken.create({
        data: {
          userId,
          participantId: participantId ?? null,
          tripId: tripId ?? null,
          token: raw,
          expiresAt,
        },
      });

      return created.token;
    })());

  const url = `${baseUrl.replace(
    /\/$/,
    ""
  )}/magic-login?token=${encodeURIComponent(token)}${
    tripId ? `&tripId=${encodeURIComponent(tripId)}` : ""
  }`;

  return {
    token,
    url,
  };
}
