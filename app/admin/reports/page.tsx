"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  TrendingUp,
  Users,
  Calendar,
  ImageIcon,
  Map,
  Search,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DailyAttendanceRow = {
  day: string;
  date: string;
  count: number;
  total: number;
  percentage: number;
};

type TopAgendaRow = {
  title: string;
  checkins: number;
  percentage: number;
};

type PhotoStatRow = {
  day: string;
  uploaded: number;
  approved: number;
  pending: number;
};

type ReportData = {
  tripId: string;
  tripName: string;
  totalParticipants: number;
  totalSchedules: number;
  avgAttendancePercent: number | null;
  totalPhotoUploaded: number;
  dailyAttendance: DailyAttendanceRow[];
  topAgenda: TopAgendaRow[];
  photoStats: PhotoStatRow[];
};

interface Trip {
  id: string;
  name: string;
  status: string;
}

export default function AdminReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [searchAgenda, setSearchAgenda] = useState("");
  const [searchPhoto, setSearchPhoto] = useState("");

  // ───────────── Export nyata ─────────────
  const handleExport = async (format: "excel" | "pdf") => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip Terlebih Dahulu",
        description: "Silakan pilih trip yang ingin diexport laporannya.",
        variant: "destructive",
      });
      return;
    }

    const fileExt = format === "excel" ? "xlsx" : "pdf";
    const pretty = format.toUpperCase();
    const tripName = report?.tripName ?? selectedTripId;

    try {
      toast({
        title: `Menyiapkan Export ${pretty}`,
        description: `Laporan untuk trip "${tripName}" sedang diproses...`,
      });

      const res = await fetch(
        `/api/reports/export?tripId=${encodeURIComponent(
          selectedTripId
        )}&format=${format}`,
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        let msg = `Gagal export (${res.status})`;
        try {
          const json = await res.json();
          if (json?.message) msg = json.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const safeName = tripName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "");
      a.download = `laporan-${safeName || "trip"}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: `Export ${pretty} Selesai`,
        description: `File laporan berhasil didownload.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: `Gagal Export ${pretty}`,
        description: err?.message || "Terjadi kesalahan saat export laporan.",
        variant: "destructive",
      });
    }
  };

  // ───────────── Load Trips ─────────────
  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal memuat trips");
      }
      setTrips(json.items ?? json.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat trips",
        variant: "destructive",
      });
    } finally {
      setLoadingTrips(false);
    }
  }

  // ───────────── Load Report ─────────────
  useEffect(() => {
    if (!selectedTripId) {
      setReport(null);
      return;
    }
    loadReport(selectedTripId);
  }, [selectedTripId]);

  async function loadReport(tripId: string) {
    setLoadingReport(true);
    try {
      const res = await fetch(
        `/api/reports?tripId=${encodeURIComponent(tripId)}`
      );
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal memuat laporan");
      }
      setReport(json.data as ReportData);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat laporan",
        variant: "destructive",
      });
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }

  const dailyAttendance = report?.dailyAttendance ?? [];
  const topAgenda = useMemo(() => {
    const raw = report?.topAgenda ?? [];
    const q = searchAgenda.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((a) => a.title.toLowerCase().includes(q));
  }, [report, searchAgenda]);

  const photoStats = useMemo(() => {
    const raw = report?.photoStats ?? [];
    const q = searchPhoto.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((p) => p.day.toLowerCase().includes(q));
  }, [report, searchPhoto]);

  const maxCheckins =
    topAgenda.length > 0 ? Math.max(...topAgenda.map((a) => a.checkins)) : 1;

  const totalUploaded = photoStats.reduce((sum, s) => sum + s.uploaded, 0);
  const totalApproved = photoStats.reduce((sum, s) => sum + s.approved, 0);
  const totalPending = photoStats.reduce((sum, s) => sum + s.pending, 0);
  const approvalRate =
    totalUploaded > 0 ? Math.round((totalApproved / totalUploaded) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Laporan & Statistik
          </h1>
          <p className="text-slate-600 mt-1">
            {report?.tripName
              ? `Analisis lengkap perjalanan ${report.tripName}`
              : "Pilih trip untuk melihat laporan dan statistik."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleExport("excel")}
            variant="outline"
            className="gap-2"
          >
            <Download size={16} />
            Export Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} className="gap-2">
            <Download size={16} />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Pilih Trip */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Map className="text-blue-600" size={20} />
            <div className="flex-1">
              <Label
                htmlFor="trip-select"
                className="text-sm font-medium text-slate-700 mb-2 block"
              >
                Pilih Trip
              </Label>
              <Select
                value={selectedTripId}
                onValueChange={(v) => setSelectedTripId(v)}
              >
                <SelectTrigger id="trip-select" className="w-full">
                  <SelectValue
                    placeholder={
                      loadingTrips
                        ? "Memuat trips..."
                        : "Pilih trip untuk melihat laporan..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      <div className="flex items-center gap-2">
                        <span>{trip.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            trip.status === "ongoing"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {trip.status === "ongoing" ? "Berjalan" : "Selesai"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kondisional konten berdasarkan trip & loading */}
      {!selectedTripId ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500">
              Silakan pilih trip di atas untuk melihat laporan dan statistik.
            </p>
          </CardContent>
        </Card>
      ) : loadingReport ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            Memuat laporan…
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Laporan tidak tersedia
            </h3>
            <p className="text-slate-500">
              Gagal memuat laporan untuk trip ini. Silakan coba lagi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.totalParticipants}
                    </p>
                    <p className="text-sm text-slate-600">Total Peserta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.totalSchedules}
                    </p>
                    <p className="text-sm text-slate-600">Total Agenda</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.avgAttendancePercent !== null
                        ? `${report.avgAttendancePercent.toFixed(1)}%`
                        : "–"}
                    </p>
                    <p className="text-sm text-slate-600">
                      Rata-rata Kehadiran
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.totalPhotoUploaded ?? 0}
                    </p>
                    <p className="text-sm text-slate-600">Foto Terunggah</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Attendance Graph */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  Grafik Kehadiran per Hari
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyAttendance.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada data kehadiran untuk trip ini.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {dailyAttendance.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center text-white">
                              <span className="text-xs font-medium">Hari</span>
                              <span className="text-xl font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.date}
                              </p>
                              <p className="text-sm text-slate-600">
                                {item.count} dari {item.total} peserta
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {item.percentage}%
                            </p>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Agenda */}
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Top Agenda Paling Banyak Dikonfirmasi
                </CardTitle>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Cari agenda..."
                    value={searchAgenda}
                    onChange={(e) => setSearchAgenda(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {topAgenda.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada agenda yang memiliki kehadiran.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topAgenda.map((agenda, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">
                                {agenda.title}
                              </p>
                              <p className="text-sm text-slate-600">
                                {agenda.checkins} check-in
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-semibold text-slate-900">
                              {agenda.percentage}%
                            </p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                maxCheckins > 0
                                  ? (agenda.checkins / maxCheckins) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Photo Statistics (placeholder untuk galeri) */}
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon size={20} />
                Statistik Foto yang Diunggah Peserta
              </CardTitle>
              <div className="relative max-w-xs">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="Filter berdasarkan hari..."
                  value={searchPhoto}
                  onChange={(e) => setSearchPhoto(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {photoStats.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Integrasi galeri belum diaktifkan. Bagian ini akan otomatis
                  terisi ketika data foto peserta sudah tersedia.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Periode
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Total Upload
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Disetujui
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Menunggu
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Tingkat Persetujuan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {photoStats.map((stat, index) => (
                        <tr
                          key={index}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {stat.day}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {stat.uploaded}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-green-600 font-medium">
                              {stat.approved}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-orange-600 font-medium">
                              {stat.pending}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${
                                      stat.uploaded > 0
                                        ? (stat.approved / stat.uploaded) * 100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-slate-700">
                                {stat.uploaded > 0
                                  ? Math.round(
                                      (stat.approved / stat.uploaded) * 100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="py-3 px-4 text-slate-900">Total</td>
                        <td className="py-3 px-4 text-slate-900">
                          {totalUploaded}
                        </td>
                        <td className="py-3 px-4 text-green-600">
                          {totalApproved}
                        </td>
                        <td className="py-3 px-4 text-orange-600">
                          {totalPending}
                        </td>
                        <td className="py-3 px-4 text-slate-900">
                          {approvalRate}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Download
                  className="text-blue-600 flex-shrink-0 mt-1"
                  size={20}
                />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Export Laporan Lengkap
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Laporan Excel dan PDF sudah menggunakan layout yang rapi
                    dengan judul trip dan logo (diambil dari{" "}
                    <code>public/logo-tourguide.png</code>). Anda dapat
                    membagikan file ini ke klien atau internal tim sebagai
                    dokumentasi resmi perjalanan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
