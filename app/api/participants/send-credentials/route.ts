import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  getWhatsAppTemplateContent,
  applyTemplate,
  type WhatsAppTemplateType,
} from "@/lib/whatsapp-templates";

const BodySchema = {
  async parse(json: any): Promise<{ tripId: string }> {
    const tripId = (json?.tripId ?? "").toString().trim();
    if (!tripId) throw new Error("tripId wajib diisi");
    return { tripId };
  },
};

function generateUsernameFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${slug}_${rnd}`;
}

function generateRandomPassword(len = 10) {
  return crypto
    .randomBytes(Math.ceil(len * 0.6))
    .toString("base64")
    .slice(0, len);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tripId } = await BodySchema.parse(body);

    const origin = new URL(req.url).origin;
    const loginUrl = `https://temanwisata.com/login`;

    // Pastikan trip ada
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil semua peserta aktif
    const participants = await prisma.participant.findMany({
      where: { tripId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    if (participants.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Belum ada peserta di trip ini" },
        { status: 400 }
      );
    }

    // Ambil daftar peserta yang SUDAH PERNAH dikirimi akun (TRIP_ACCOUNT_CREATED)
    const existingMsgs = await prisma.whatsAppMessage.findMany({
      where: {
        tripId,
        template: "TRIP_ACCOUNT_CREATED",
      },
      select: { participantId: true },
    });

    const alreadySentSet = new Set(
      existingMsgs
        .map((m) => m.participantId)
        .filter((id): id is string => !!id)
    );

    let sentCount = 0;
    let skippedAlreadySent = 0;
    let failedCount = 0;

    for (const p of participants) {
      // === GUARD: kalau sudah pernah dikirim, skip ===
      if (alreadySentSet.has(p.id)) {
        skippedAlreadySent++;
        continue;
      }

      try {
        // --- Cari / buat user berdasarkan whatsapp ---
        let user = await prisma.user
          .findUnique({ where: { whatsapp: p.whatsapp } })
          .catch(() => null);

        let plainPassword: string | undefined;
        let loginUsernameForParticipant: string | undefined;

        if (user) {
          // user sudah ada → pastikan nama & wa update
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              name: p.name,
              whatsapp: p.whatsapp,
            },
          });
        } else {
          // user belum ada → buat user baru + password awal
          const username = generateUsernameFromName(p.name);
          const rawPassword = generateRandomPassword(10);
          const hashed = await bcrypt.hash(rawPassword, 10);

          user = await prisma.user.create({
            data: {
              username,
              password: hashed,
              name: p.name,
              whatsapp: p.whatsapp,
              role: "PESERTA",
              isActive: true,
            },
          });

          plainPassword = rawPassword;
          loginUsernameForParticipant = username;

          // simpan username + initialPassword ke participant
          await prisma.participant.update({
            where: { id: p.id },
            data: {
              loginUsername: username,
              initialPassword: rawPassword,
            },
          });
        }

        const userResp = {
          id: user!.id,
          username: user!.username,
        };

        // Jika akun sudah ada & participant belum punya initialPassword,
        // reset password SEKALI dan simpan sebagai initialPassword
        if (!plainPassword && !p.initialPassword) {
          const resetPassword = generateRandomPassword(10);
          const hashedReset = await bcrypt.hash(resetPassword, 10);

          await prisma.user.update({
            where: { id: userResp.id },
            data: { password: hashedReset },
          });

          await prisma.participant.update({
            where: { id: p.id },
            data: { initialPassword: resetPassword },
          });

          plainPassword = resetPassword;
        }

        // Pastikan UserTrip terhubung
        const link = await prisma.userTrip.findUnique({
          where: { userId_tripId: { userId: userResp.id, tripId } },
        });
        if (!link) {
          await prisma.userTrip.create({
            data: {
              userId: userResp.id,
              tripId,
              roleOnTrip: "PESERTA",
              participantId: p.id,
            },
          });
        }

        // === TEMPLATE WA: SELALU PAKAI PARTICIPANT_REGISTERED_NEW ===
        const type: WhatsAppTemplateType = "PARTICIPANT_REGISTERED_NEW";

        const { content: templateContent } = await getWhatsAppTemplateContent(
          tripId,
          type
        );

        const loginUsername =
          loginUsernameForParticipant ||
          p.loginUsername ||
          userResp.username ||
          "akunanda";

        // Password yang dikirim:
        // - kalau barusan buat / reset user: plainPassword
        // - kalau sudah punya initialPassword: pakai itu
        const loginPassword = plainPassword ?? p.initialPassword ?? "";

        const content = applyTemplate(templateContent, {
          participant_name: p.name,
          trip_name: trip.name,
          trip_location: trip.location ?? "",
          login_username: loginUsername,
          login_password: loginPassword,
          login_url: loginUrl,
        });

        const templateCode = "TRIP_ACCOUNT_CREATED";

        await prisma.whatsAppMessage.create({
          data: {
            tripId,
            participantId: p.id,
            to: p.whatsapp,
            template: templateCode,
            content,
            payload: {
              type: templateCode,
              tripId,
              participantId: p.id,
              userId: userResp.id,
            },
            status: "PENDING",
          },
        });

        sentCount++;
      } catch (innerErr) {
        console.error(
          "Gagal enqueue WA credential untuk participant",
          p.id,
          innerErr
        );
        failedCount++;
      }
    }

    // Trigger worker WA sekali saja
    try {
      await fetch(`${origin}/api/wa/worker-send`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Gagal memanggil worker-send dari /send-credentials:", e);
    }

    return NextResponse.json({
      ok: true,
      message: "Proses kirim akun ke peserta telah diantrikan.",
      totalParticipants: participants.length,
      sentCount,
      skippedAlreadySent,
      failedCount,
    });
  } catch (err: any) {
    console.error("POST /api/participants/send-credentials error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
