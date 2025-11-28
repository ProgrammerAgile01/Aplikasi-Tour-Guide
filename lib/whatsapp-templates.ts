import prisma from "@/lib/prisma";

export type WhatsAppTemplateType =
  | "SCHEDULE"
  | "PARTICIPANT_REGISTERED_NEW"
  | "PARTICIPANT_REGISTERED_EXISTING"
  | "ANNOUNCEMENT";

// Nama default per tipe (untuk UI)
export function getDefaultTemplateName(type: WhatsAppTemplateType): string {
  switch (type) {
    case "SCHEDULE":
      return "Template Kirim Jadwal Trip";
    case "PARTICIPANT_REGISTERED_NEW":
      return "Peserta Didaftarkan (Akun Baru)";
    case "PARTICIPANT_REGISTERED_EXISTING":
      return "Peserta Didaftarkan (Akun Sudah Ada)";
    case "ANNOUNCEMENT":
      return "Template Pengumuman Trip";
    default:
      return "Template WhatsApp";
  }
}

// Isi default per tipe (pakai placeholder)
export function getDefaultTemplateContent(type: WhatsAppTemplateType): string {
  switch (type) {
    case "SCHEDULE":
      return [
        "Halo {{participant_name}}! 👋",
        "",
        'Berikut jadwal untuk trip "{{trip_name}}".',
        "",
        "Periode: {{trip_date_range}}",
        "Lokasi: {{trip_location}}",
        "",
        "{{schedule_block}}",
        "",
        "Jika ada perubahan jadwal penting, kami akan menginformasikan kembali melalui WhatsApp. 🙏",
        "",
        "Terima kasih,",
        "Tim Teman Wisata",
      ].join("\n");

    case "PARTICIPANT_REGISTERED_NEW":
      return [
        "Halo {{participant_name}}! 👋",
        "",
        "Kamu resmi terdaftar sebagai peserta trip:",
        "📍 Trip: {{trip_name}}",
        "🌍 Lokasi: {{trip_location}}",
        "",
        "Berikut akun untuk akses aplikasi Teman Wisata:",
        "",
        "🔐 Login",
        "• Username   : {{login_username}}",
        "• Password   : {{login_password}}",
        "",
        "Kamu bisa login dengan 2 cara:",
        "1) Klik langsung link berikut (tanpa perlu input password, berlaku 1 bulan):",
        "{{magic_login_url}}",
        "",
        "2) Atau masuk manual ke:",
        "{{login_url}}",
        "",
        "Setelah berhasil login, segera ganti password di menu Profil demi keamanan ya 🙏",
        "",
        "Terima kasih,",
        "Tim Teman Wisata",
      ].join("\n");

    case "PARTICIPANT_REGISTERED_EXISTING":
      return [
        "Halo {{participant_name}}! 👋",
        "",
        "Nomor WhatsApp kamu telah ditambahkan sebagai peserta trip:",
        "📍 Trip: {{trip_name}}",
        "🌍 Lokasi: {{trip_location}}",
        "",
        "Kamu bisa masuk ke aplikasi Teman Wisata lewat:",
        "",
        "➡️ Magic link (langsung masuk, tanpa password, berlaku 1 bulan):",
        "{{magic_login_url}}",
        "",
        "Atau login manual di:",
        "{{login_url}}",
        "",
        "Jika lupa password, kamu bisa gunakan fitur *Lupa Password* di halaman login. 🙏",
        "",
        "Terima kasih,",
        "Tim Teman Wisata",
      ].join("\n");

    case "ANNOUNCEMENT":
      return [
        "Halo {{participant_name}}! 👋",
        "",
        "{{priority_header}}",
        "",
        "Trip: *{{trip_name}}*",
        "Lokasi: {{trip_location}}",
        "",
        "📌 *{{announcement_title}}*",
        "",
        "{{announcement_content}}",
        "",
        "Jika ada pertanyaan, silakan hubungi tour leader / admin.",
        "Terima kasih 🙏",
      ].join("\n");

    default:
      return "";
  }
}

// Ambil template content (kalau belum ada → default)
export async function getWhatsAppTemplateContent(
  tripId: string,
  type: WhatsAppTemplateType
): Promise<{ name: string; content: string }> {
  const tmpl = await prisma.whatsAppTemplate.findFirst({
    where: { tripId, type },
  });

  if (!tmpl) {
    return {
      name: getDefaultTemplateName(type),
      content: getDefaultTemplateContent(type),
    };
  }

  return {
    name: tmpl.name,
    content: tmpl.content,
  };
}

// Simple {{placeholder}} replacer
export function applyTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const val = vars[key];
    if (val === null || val === undefined) return "";
    return String(val);
  });
}
