import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    // Get trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    // Get all participants
    const participants = await prisma.participant.findMany({
      where: {
        tripId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    function formatDate(d?: Date | string | null): string {
      if (!d) return "";
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    function calculateAge(d?: Date | string | null): number | "" {
      if (!d) return "";
      const birth = new Date(d);
      if (Number.isNaN(birth.getTime())) return "";
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age >= 0 ? age : "";
    }

    // Build rows
    const rows = participants.map((p, i) => ({
      No: i + 1,
      "ID Peserta": p.id,
      "Nama Lengkap": p.name,
      "Nomor WhatsApp": p.whatsapp,
      "NIK / Identitas": p.nik ?? "",
      "Tempat Lahir": p.birthPlace ?? "",
      "Tanggal Lahir": formatDate(p.birthDate),
      "Jenis Kelamin":
        p.gender === "MALE"
          ? "Laki-laki"
          : p.gender === "FEMALE"
          ? "Perempuan"
          : "",
      "Umur (th)": calculateAge(p.birthDate),
      "Nomor Kamar": p.roomNumber ?? "",
      "Alamat Lengkap": p.address,
      Catatan: p.note ?? "",
      "Total Check-in": p.totalCheckIns,
      "Terakhir Check-in": p.lastCheckIn ?? "",
      "Username Login": p.loginUsername ?? "",
      "Password Awal": p.initialPassword ?? "",
      "Dibuat Pada": formatDate(p.createdAt),
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(rows, { origin: "A1" });

    // Auto width
    const colWidths = Object.keys(rows[0] ?? {}).map(() => ({ wch: 25 }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Peserta");

    // Generate buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const safeTripName = (trip?.name || "trip").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `peserta-${safeTripName}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("EXPORT XLSX ERROR:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
