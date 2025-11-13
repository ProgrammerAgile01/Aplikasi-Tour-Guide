import { NextResponse } from "next/server";

const WA_SERVICE_URL = process.env.WA_SERVICE_URL!;
const WA_API_KEY = process.env.WA_API_KEY!;

export async function GET() {
  try {
    const resp = await fetch(`${WA_SERVICE_URL}/status`, {
      headers: { "x-api-key": WA_API_KEY },
    });

    const data = await resp.json();

    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error("WA status error:", err);
    return NextResponse.json(
      { ok: false, message: "Tidak bisa menghubungi WA service" },
      { status: 500 }
    );
  }
}
