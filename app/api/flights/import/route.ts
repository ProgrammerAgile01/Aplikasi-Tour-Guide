import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function normalizeRole(raw: string | undefined | null): "PESERTA" | "TL_AGENT" {
  const v = (raw ?? "").toString().trim().toUpperCase();
  if (
    v === "TL" ||
    v === "TL_AGENT" ||
    v === "TL AGENT" ||
    v === "TOUR LEADER"
  ) {
    return "TL_AGENT";
  }
  return "PESERTA";
}

function normalizeDirection(
  raw: string | undefined | null
): "DEPARTURE" | "RETURN" {
  const v = (raw ?? "").toString().trim().toUpperCase();
  if (v === "RETURN" || v === "PULANG" || v === "R") return "RETURN";
  // default DEPARTURE
  return "DEPARTURE";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const tripId = formData.get("tripId")?.toString();
    const file = formData.get("file");

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib dikirim" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "File Excel belum diupload" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { ok: false, message: "File Excel tidak memiliki sheet" },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada data di dalam Excel" },
        { status: 400 }
      );
    }

    const records: any[] = [];
    let skipped = 0;

    for (const row of rows) {
      const passengerName = row["Nama"]?.toString().trim();
      const flightNumber1 = row["Pesawat1"]?.toString().trim();
      const airline1 = row["Maskapai1"]?.toString().trim();
      const ticketNumber = row["NomorTiket"]?.toString().trim();

      // Wajib terisi, kalau tidak → skip baris
      if (!passengerName || !flightNumber1 || !airline1 || !ticketNumber) {
        skipped++;
        continue;
      }

      const role = normalizeRole(row["Role"]);
      const direction = normalizeDirection(row["Arah"]);

      const orderId = row["OrderId"]?.toString().trim() || null;
      const flightNumber2 = row["Pesawat2"]?.toString().trim() || null;
      const airline2 = row["Maskapai2"]?.toString().trim() || null;
      const notes = row["Catatan"]?.toString().trim() || null;

      records.push({
        tripId,
        passengerName,
        role,
        orderId,
        flightNumber1,
        flightNumber2,
        airline1,
        airline2,
        ticketNumber,
        direction,
        notes,
      });
    }

    if (!records.length) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tidak ada baris valid yang bisa diimport. Periksa kembali format kolom Excel.",
          skipped,
        },
        { status: 400 }
      );
    }

    const result = await prisma.flight.createMany({
      data: records,
    });

    return NextResponse.json({
      ok: true,
      message: "Import data penerbangan berhasil",
      inserted: result.count,
      skipped,
      totalRows: rows.length,
    });
  } catch (err: any) {
    console.error("POST /api/flights/import error:", err);
    return NextResponse.json(
      { ok: false, message: "Gagal memproses file Excel" },
      { status: 500 }
    );
  }
}
