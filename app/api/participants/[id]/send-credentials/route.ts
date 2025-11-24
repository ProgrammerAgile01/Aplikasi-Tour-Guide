import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  getWhatsAppTemplateContent,
  applyTemplate,
  type WhatsAppTemplateType,
} from "@/lib/whatsapp-templates";

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

// Helper: ambil participantId langsung dari URL
function resolveParticipantIdFromUrl(req: Request): string | undefined {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // .../api/participants/[id]/send-credentials
    const idx = parts.findIndex((p) => p === "participants");
    const raw = idx >= 0 ? parts[idx + 1] : undefined;
    return raw ? decodeURIComponent(raw) : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    const participantId = resolveParticipantIdFromUrl(req);

    if (!participantId) {
      return NextResponse.json(
        { ok: false, message: "participantId tidak valid" },
        { status: 400 }
      );
    }

    const origin = new URL(req.url).origin;
    const loginUrl = `https://temanwisata.com/login`;

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: participant.tripId },
    });

    if (!trip || trip.deletedAt) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // === GUARD: cek apakah sudah pernah dikirimi akun (TRIP_ACCOUNT_CREATED) ===
    const existingMsg = await prisma.whatsAppMessage.findFirst({
      where: {
        tripId: participant.tripId,
        participantId: participant.id,
        template: "TRIP_ACCOUNT_CREATED",
      },
    });

    if (existingMsg) {
      return NextResponse.json({
        ok: true,
        sent: false,
        alreadySent: true,
        message: "Akun peserta ini sudah pernah dikirim sebelumnya.",
      });
    }

    // Cari / buat user berdasarkan whatsapp
    let user = await prisma.user
      .findUnique({ where: { whatsapp: participant.whatsapp } })
      .catch(() => null);

    let plainPassword: string | undefined;
    let loginUsernameForParticipant: string | undefined;

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: participant.name,
          whatsapp: participant.whatsapp,
        },
      });
    } else {
      const username = generateUsernameFromName(participant.name);
      const rawPassword = generateRandomPassword(10);
      const hashed = await bcrypt.hash(rawPassword, 10);

      user = await prisma.user.create({
        data: {
          username,
          password: hashed,
          name: participant.name,
          whatsapp: participant.whatsapp,
          role: "PESERTA",
          isActive: true,
        },
      });

      plainPassword = rawPassword;
      loginUsernameForParticipant = username;

      await prisma.participant.update({
        where: { id: participant.id },
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
    if (!plainPassword && !participant.initialPassword) {
      const resetPassword = generateRandomPassword(10);
      const hashedReset = await bcrypt.hash(resetPassword, 10);

      await prisma.user.update({
        where: { id: userResp.id },
        data: { password: hashedReset },
      });

      await prisma.participant.update({
        where: { id: participant.id },
        data: { initialPassword: resetPassword },
      });

      plainPassword = resetPassword;
    }

    // Pastikan UserTrip
    const link = await prisma.userTrip.findUnique({
      where: {
        userId_tripId: { userId: userResp.id, tripId: participant.tripId },
      },
    });
    if (!link) {
      await prisma.userTrip.create({
        data: {
          userId: userResp.id,
          tripId: participant.tripId,
          roleOnTrip: "PESERTA",
          participantId: participant.id,
        },
      });
    }

    // === TEMPLATE WA: SELALU PAKAI PARTICIPANT_REGISTERED_NEW ===
    const type: WhatsAppTemplateType = "PARTICIPANT_REGISTERED_NEW";

    const { content: templateContent } = await getWhatsAppTemplateContent(
      participant.tripId,
      type
    );

    const loginUsername =
      loginUsernameForParticipant ||
      participant.loginUsername ||
      userResp.username ||
      "akunanda";

    const loginPassword = plainPassword ?? participant.initialPassword ?? "";

    const content = applyTemplate(templateContent, {
      participant_name: participant.name,
      trip_name: trip.name,
      trip_location: trip.location ?? "",
      login_username: loginUsername,
      login_password: loginPassword,
      login_url: loginUrl,
    });

    const templateCode = "TRIP_ACCOUNT_CREATED";

    await prisma.whatsAppMessage.create({
      data: {
        tripId: participant.tripId,
        participantId: participant.id,
        to: participant.whatsapp,
        template: templateCode,
        content,
        payload: {
          type: templateCode,
          tripId: participant.tripId,
          participantId: participant.id,
          userId: userResp.id,
        },
        status: "PENDING",
      },
    });

    // panggil worker
    try {
      await fetch(`${origin}/api/wa/worker-send`, {
        method: "POST",
      });
    } catch (e) {
      console.error(
        "Gagal memanggil worker-send dari /[id]/send-credentials:",
        e
      );
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      alreadySent: false,
      message: "Akun peserta berhasil diantrikan ke WhatsApp.",
    });
  } catch (err: any) {
    console.error("POST /api/participants/[id]/send-credentials error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
