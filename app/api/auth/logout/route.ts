// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  // Set cookie expired
  const res = NextResponse.json({ ok: true });
  // Overwrite cookie with Max-Age=0 so browser deletes it
  res.headers.set(
    "Set-Cookie",
    `token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}