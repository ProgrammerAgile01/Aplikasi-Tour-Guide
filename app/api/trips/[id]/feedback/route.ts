import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

type SessionPayload = {
  user?: {
    id: string;
    role: string;
    username?: string | null;
    name?: string | null;
  };
  trips?: Array<{ id: string; name?: string; roleOnTrip?: string }>;
};

const FeedbackBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  notes: z.string().trim().max(2000).optional().nullable(),
  participantId: z.string().optional().nullable(),
  sessionId: z.string().min(1, "sessionId wajib").optional().nullable(),
});

/* -----------------------------
 *  Helper tripId (disamakan dgn /overview)
 * ----------------------------- */
async function resolveTripId(
  req: Request,
  params: any
): Promise<string | undefined> {
  try {
    let p = params;
    if (p && typeof p.then === "function") p = await p;
    const idFromParams = p?.id ?? p?.["0"] ?? p?.tripId;
    if (idFromParams) return decodeURIComponent(String(idFromParams));
  } catch {}

  try {
    const pathname = new URL(req.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const i = parts.findIndex((x) => x === "trips");
    const id = i >= 0 ? parts[i + 1] : parts[parts.length - 2];
    return id ? decodeURIComponent(id) : undefined;
  } catch {
    return undefined;
  }
}

/* -----------------------------
 *  Helper: cari participantId dari session
 *  mapping via loginUsername
 * ----------------------------- */
async function resolveParticipantIdForSession(
  payload: SessionPayload,
  tripId: string
): Promise<string | null> {
  const username = payload.user?.username ?? null;
  if (!username) return null;

  const participant = await prisma.participant.findFirst({
    where: {
      tripId,
      loginUsername: username,
    },
    select: { id: true },
  });

  return participant?.id ?? null;
}

/* ======================
 * POST: create/update per session
 * ====================== */

export async function POST(req: Request, ctx: { params: any }) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    const tripId = await resolveTripId(req, ctx.params);
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Bad Request: tripId missing" },
        { status: 400 }
      );
    }

    if (role !== "ADMIN") {
      const ownsTrip = (payload.trips ?? []).some((t) => t.id === tripId);
      if (!ownsTrip) {
        return NextResponse.json(
          { ok: false, message: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const json = await req.json().catch(() => null);
    const parsed = FeedbackBody.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Payload tidak valid",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      rating,
      notes,
      participantId: participantIdFromBody,
      sessionId: sessionIdFromBody,
    } = parsed.data;

    const sessionId = sessionIdFromBody ?? null;
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, message: "sessionId wajib diisi" },
        { status: 400 }
      );
    }

    // validasi sessionId milik trip ini
    const session = await prisma.schedule.findFirst({
      where: { id: sessionId, tripId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Sesi/jadwal tidak valid untuk trip ini" },
        { status: 400 }
      );
    }

    // tentukan participantId final
    let participantId: string | null = participantIdFromBody ?? null;
    if (!participantId) {
      participantId = await resolveParticipantIdForSession(payload, tripId);
    }

    let feedback;

    if (participantId) {
      // peserta jelas → 1 feedback per sesi
      feedback = await prisma.feedback.upsert({
        where: {
          tripId_participantId_sessionId: {
            tripId,
            participantId,
            sessionId,
          },
        },
        update: {
          rating,
          notes: notes ?? null,
        },
        create: {
          tripId,
          participantId,
          sessionId,
          rating,
          notes: notes ?? null,
        },
      });
    } else {
      // anonymous: 1 submit = 1 record, per sesi
      feedback = await prisma.feedback.create({
        data: {
          tripId,
          sessionId,
          rating,
          notes: notes ?? null,
        },
      });
    }

    return NextResponse.json(
      { ok: true, message: "Feedback tersimpan", data: feedback },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error POST /api/trips/[tripId]/feedback:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Terjadi kesalahan server",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

/* -----------------------------
 *  GET /api/trips/[tripId]/feedback
 *  - ?scope=all  (default): semua feedback trip
 *  - ?scope=mine : feedback milik peserta yang login (1 baris)
 * ----------------------------- */
export async function GET(req: Request, ctx: { params: any }) {
  try {
    const payload = (await getSessionFromRequest(req)) as SessionPayload | null;
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const role = String(payload.user?.role ?? "").toUpperCase();
    const tripId = await resolveTripId(req, ctx.params);
    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "Bad Request: tripId missing" },
        { status: 400 }
      );
    }

    if (role !== "ADMIN") {
      const ownsTrip = (payload.trips ?? []).some((t) => t.id === tripId);
      if (!ownsTrip) {
        return NextResponse.json(
          { ok: false, message: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "all";

    if (scope === "mine") {
      const participantId = await resolveParticipantIdForSession(
        payload,
        tripId
      );

      // Ambil semua jadwal trip ini → untuk dropdown
      const sessions = await prisma.schedule.findMany({
        where: { tripId },
        select: {
          id: true,
          day: true,
          title: true,
          dateText: true,
          timeText: true,
        },
        orderBy: [{ day: "asc" }, { timeText: "asc" }],
      });

      if (!participantId) {
        // belum mapping ke participant → tetep kirim daftar sessions
        return NextResponse.json(
          {
            ok: true,
            data: null,
            sessions,
            lastSessionId: null,
            currentSessionId: null,
          },
          { status: 200 }
        );
      }

      // cari sesi terakhir dihadiri (Attendance)
      const lastAttendance = await prisma.attendance.findFirst({
        where: {
          tripId,
          participantId,
        },
        select: { sessionId: true },
        orderBy: { checkedAt: "desc" },
      });

      const sessionIdParam = url.searchParams.get("sessionId");
      const targetSessionId =
        sessionIdParam || lastAttendance?.sessionId || sessions[0]?.id || null;

      let feedback = null;
      if (targetSessionId) {
        feedback = await prisma.feedback.findUnique({
          where: {
            tripId_participantId_sessionId: {
              tripId,
              participantId,
              sessionId: targetSessionId,
            },
          },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          data: feedback,
          sessions,
          lastSessionId: lastAttendance?.sessionId ?? null,
          currentSessionId: targetSessionId,
        },
        { status: 200 }
      );
    }

    // scope = all → daftar semua feedback (bisa dipakai admin)
    const feedbacks = await prisma.feedback.findMany({
      where: { tripId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            loginUsername: true,
          },
        },
        session: {
          select: {
            id: true,
            day: true,
            title: true,
            dateText: true,
            timeText: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: feedbacks }, { status: 200 });
  } catch (error: any) {
    console.error("Error GET /api/trips/[tripId]/feedback:", error);
    return NextResponse.json(
      { ok: false, message: "Terjadi kesalahan server", error: error?.message },
      { status: 500 }
    );
  }
}
