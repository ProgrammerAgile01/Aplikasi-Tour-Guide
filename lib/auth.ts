import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ?? "please-set-a-secure-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "2h";

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function createAuthCookie(token: string) {
  // cookie options
  const secure = process.env.NODE_ENV === "production";
  // Set-Cookie string (httpOnly)
  // Max-Age is derived from JWT_EXPIRES_IN if simple; use 7 days default
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  return `token=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

// parse cookie header simple
export function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((c) => {
    const [k, ...v] = c.trim().split("=");
    cookies[k] = decodeURIComponent(v.join("="));
  });
  return cookies;
}

// Get session from Request (route handlers)
import { NextRequest } from "next/server";
export function getSessionFromRequest(req: Request | NextRequest) {
  const cookieHeader = (req as any).headers?.get ? (req as any).headers.get("cookie") : undefined;
  const cookies = parseCookies(cookieHeader ?? null);
  const token = cookies["token"];
  if (!token) return null;
  return verifyToken(token);
}