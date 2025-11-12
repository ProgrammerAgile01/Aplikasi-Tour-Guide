import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json(
        { ok: false, message: "q is required" },
        { status: 400 }
      );
    }

    // optional: lat,lon untuk memprioritaskan area sekitar
    const near = searchParams.get("near");
    let viewbox: string | undefined;
    if (near) {
      const [latStr, lonStr] = near.split(",");
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const d = 0.6; // ~bias sekitar ±0.6 derajat
        // format: left,top,right,bottom
        viewbox = `${(lon - d).toFixed(6)},${(lat + d).toFixed(6)},${(
          lon + d
        ).toFixed(6)},${(lat - d).toFixed(6)}`;
      }
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", q);
    url.searchParams.set("addressdetails", "0");
    // Bias ke Indonesia agar hasil lebih akurat
    url.searchParams.set("countrycodes", "id");
    if (viewbox) {
      url.searchParams.set("viewbox", viewbox);
      // tanpa bounded=1 supaya jadi preferensi (bukan pembatas keras)
    }

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "id,en;q=0.8",
        "User-Agent": "AgileStore-TourGuide/1.0 (support@agilestore.id)",
        Referer: "https://agilestore.id",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, message: text || "Geocode failed" },
        { status: 502 }
      );
    }

    const json = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    if (!json?.length) {
      return NextResponse.json({ ok: true, found: false });
    }

    const { lat, lon, display_name } = json[0];
    return NextResponse.json({
      ok: true,
      found: true,
      lat: Number(lat),
      lon: Number(lon),
      displayName: display_name,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
