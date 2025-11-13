import { NextResponse } from "next/server";

const WA_SERVICE_URL = process.env.WA_SERVICE_URL!;
const WA_API_KEY = process.env.WA_API_KEY!;

export async function POST() {
  try {
    const resp = await fetch(`${WA_SERVICE_URL}/disconnect`, {
      method: "POST",
      headers: { "x-api-key": WA_API_KEY },
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error("WA disconnect error:", err);
    return NextResponse.json(
      { ok: false, message: "Tidak bisa menghubungi WA service" },
      { status: 500 }
    );
  }
}
