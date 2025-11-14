import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const CreateParticipantSchema = z.object({
  name: z.string().trim().min(1),
  whatsapp: z.string().trim().min(3),
  address: z.string().trim().min(1),
  tripId: z.string().trim().min(1),
});

function generateEmailFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${rnd}@trip.com`;
}

function generateRandomPassword(len = 10) {
  return crypto
    .randomBytes(Math.ceil(len * 0.6))
    .toString("base64")
    .slice(0, len);
}

// ==================== WA MESSAGE BUILDERS ====================

function buildNewAccountWhatsAppMessage(opts: {
  trip: any;
  participant: any;
  email: string;
  password: string;
  loginUrl: string;
}) {
  const { trip, participant, email, password, loginUrl } = opts;

  const lines: string[] = [];
  lines.push(`Halo ${participant.name}! 👋`);
  lines.push("");
  lines.push("Kamu resmi terdaftar sebagai peserta trip:");
  lines.push(`📍 Trip: ${trip.name}`);
  if (trip.location) {
    lines.push(`🌍 Lokasi: ${trip.location}`);
  }
  lines.push("");
  lines.push("Berikut akun untuk akses aplikasi Tour Guide:");
  lines.push("");
  lines.push("🔐 Login");
  lines.push(`• Email   : ${email}`);
  lines.push(`• Password: ${password}`);
  lines.push("");
  lines.push("Silakan login di:");
  lines.push(loginUrl);
  lines.push("");
  lines.push(
    "Setelah berhasil login, segera ganti password di menu Profil demi keamanan ya 🙏"
  );
  lines.push("");
  lines.push("Terima kasih,");
  lines.push("Tim Tour Guide");

  return lines.join("\n");
}

function buildExistingAccountWhatsAppMessage(opts: {
  trip: any;
  participant: any;
  email: string;
  loginUrl: string;
}) {
  const { trip, participant, email, loginUrl } = opts;

  const lines: string[] = [];
  lines.push(`Halo ${participant.name}! 👋`);
  lines.push("");
  lines.push("Nomor WhatsApp kamu telah ditambahkan sebagai peserta trip:");
  lines.push(`📍 Trip: ${trip.name}`);
  if (trip.location) {
    lines.push(`🌍 Lokasi: ${trip.location}`);
  }
  lines.push("");
  lines.push(
    "Silakan login ke aplikasi Tour Guide dengan akun yang sudah pernah kami kirim sebelumnya."
  );
  lines.push("");
  lines.push("🔐 Login:");
  lines.push(`• Email: ${email}`);
  lines.push("");
  lines.push("Akses aplikasi di:");
  lines.push(loginUrl);
  lines.push("");
  lines.push(
    "Jika lupa password, kamu bisa gunakan fitur *Lupa Password* di halaman login. 🙏"
  );
  lines.push("");
  lines.push("Terima kasih,");
  lines.push("Tim Tour Guide");

  return lines.join("\n");
}

// ==================== HANDLERS ====================

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId") ?? undefined;
    const q = searchParams.get("q") ?? "";
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId required" },
        { status: 400 }
      );
    }

    const where: any = { tripId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        take,
        skip,
      }),
      prisma.participant.count({ where }),
    ]);

    return NextResponse.json({ ok: true, total, items });
  } catch (err: any) {
    console.error("GET /api/participants error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateParticipantSchema.parse(body);

    // cek trip
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      return NextResponse.json(
        { ok: false, message: "Trip tidak ditemukan" },
        { status: 404 }
      );
    }

    // ==================== USER & PARTICIPANT ====================

    // Cek user by whatsapp
    let user = await prisma.user
      .findUnique({ where: { whatsapp: data.whatsapp } })
      .catch(() => null);

    let plainPassword: string | undefined;
    let loginEmailForParticipant: string | undefined;

    if (user) {
      // User sudah ada → update nama/whatsapp bila perlu
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: data.name, whatsapp: data.whatsapp },
      });
      // Tidak membuat password baru (biarkan pakai yg lama)
    } else {
      // Buat user baru + password awal
      const email = generateEmailFromName(data.name);
      const rawPassword = generateRandomPassword(10);
      const hashed = await bcrypt.hash(rawPassword, 10);

      const createdUser = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name: data.name,
          whatsapp: data.whatsapp,
          role: "PESERTA",
          isActive: true,
        },
      });

      user = createdUser;
      plainPassword = rawPassword;
      loginEmailForParticipant = email;
    }

    // Buat participant (sekaligus simpan credential awal jika user baru)
    const createdParticipant = await prisma.participant.create({
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        address: data.address,
        tripId: data.tripId,
        ...(plainPassword && loginEmailForParticipant
          ? {
              loginEmail: loginEmailForParticipant,
              initialPassword: plainPassword,
              initialPasswordAt: new Date(),
            }
          : {}),
      },
    });

    // Pastikan relasi UserTrip (user ↔ trip)
    const link = await prisma.userTrip.findUnique({
      where: { userId_tripId: { userId: user!.id, tripId: data.tripId } },
    });
    if (!link) {
      await prisma.userTrip.create({
        data: {
          userId: user!.id,
          tripId: data.tripId,
          roleOnTrip: "PESERTA",
          participantId: createdParticipant.id,
        },
      });
    }

    const userResp = {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      whatsapp: user!.whatsapp,
      role: user!.role,
      isActive: user!.isActive,
    };

    // ==================== ENQUEUE WHATSAPP MESSAGE ====================

    try {
      const origin = new URL(req.url).origin; // contoh: http://localhost:3010
      const loginUrl = `${origin}/login`; // sesuaikan kalau route login beda

      let content: string;
      let template: string;

      if (plainPassword && (loginEmailForParticipant || userResp.email)) {
        // user baru → kirim email + password
        const emailToSend = loginEmailForParticipant || userResp.email;
        content = buildNewAccountWhatsAppMessage({
          trip,
          participant: createdParticipant,
          email: emailToSend,
          password: plainPassword,
          loginUrl,
        });
        template = "TRIP_ACCOUNT_CREATED";
      } else {
        // user sudah pernah ada → kirim info link ke trip + email saja
        content = buildExistingAccountWhatsAppMessage({
          trip,
          participant: createdParticipant,
          email: userResp.email,
          loginUrl,
        });
        template = "TRIP_ACCOUNT_LINKED";
      }

      await prisma.whatsAppMessage.create({
        data: {
          tripId: data.tripId,
          participantId: createdParticipant.id,
          to: data.whatsapp,
          template,
          content,
          payload: {
            type: template,
            tripId: data.tripId,
            participantId: createdParticipant.id,
            userId: userResp.id,
          },
          status: "PENDING",
        },
      });

      // 🔔 Trigger worker WA (fire-and-forget)
      fetch(`${origin}/api/wa/worker-send`, {
        method: "POST",
      }).catch((e) => {
        console.error("Gagal memanggil worker-send dari /api/participants:", e);
      });
    } catch (waErr) {
      console.error("Gagal enqueue WA credential peserta:", waErr);
      // tidak menggagalkan pembuatan peserta
    }

    return NextResponse.json(
      {
        ok: true,
        participant: createdParticipant, // berisi loginEmail/initialPassword bila baru
        user: { ...userResp, plainPassword },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/participants error", err);
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
