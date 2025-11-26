// app/api/flights/template/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  // Header kolom sesuai dengan yang dipakai import
  const headers = [
    [
      "Nama",
      "Role",
      "OrderId",
      "Pesawat1",
      "Pesawat2",
      "Maskapai1",
      "Maskapai2",
      "NomorTiket",
      "Arah",
      "Catatan",
    ],
  ];

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(headers);
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-penerbangan.xlsx"',
    },
  });
}
