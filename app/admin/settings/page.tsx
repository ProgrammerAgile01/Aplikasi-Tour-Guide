import { GlobalSettingsCard } from "@/components/settings/trip-info-settings";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Pengaturan Aplikasi
          </h1>
          <p className="text-slate-600 mt-1">
            Atur logo aplikasi, nama trip, dan deskripsi yang digunakan di tampilan
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2">
        {/* info trip setting */}
        <GlobalSettingsCard />

        {/* Nanti kalau ada card lain tinggal tambahkan di sini */}
      </div>
    </div>
  );
}
