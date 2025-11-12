import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth"; // server helper (lib/auth.ts)

export async function GET(req: Request) {
  try {
    const payload = getSessionFromRequest(req);
    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // payload is what we signed earlier: { user: {...}, trips: [...] }
    return NextResponse.json({
      ok: true,
      user: payload.user,
      trips: payload.trips,
    });
  } catch (err: any) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}