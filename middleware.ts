import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET ?? "please-set-a-secure-secret";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Hanya pagar area admin (login, assets, dll. aman)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // ✅ Ambil cookie langsung dari NextRequest (jangan parse header manual)
  const token = req.cookies.get("token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    // ✅ Verifikasi JWT di Edge runtime (HS256)
    const { payload } = await jwtVerify(token, secretKey);
    const role = String((payload as any)?.user?.role ?? "").toUpperCase();

    if (role !== "ADMIN") {
      // Non-admin coba akses /admin → tolak
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Lolos → lanjut
    return NextResponse.next();
  } catch {
    // Token invalid/expired → ke login
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
