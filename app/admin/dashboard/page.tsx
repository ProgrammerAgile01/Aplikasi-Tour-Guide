// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle2, ImageIcon, Map } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type DashboardStats = {
  totalParticipants: number;
  totalAgenda: number;
  attendanceRate: number;
  totalPhotos: number;
};

type DailyAttendanceItem = {
  day: string;
  date: string;
  count: number;
  total: number;
  percentage: number;
};

type ActivityItem = {
  user: string;
  action: string;
  time: string;
};

type DashboardApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    trip: {
      id: string;
      name: string;
      status: string;
      startDate: string;
      endDate: string;
    };
    stats: DashboardStats;
    dailyAttendance: DailyAttendanceItem[];
    recentActivity: ActivityItem[];
  };
};

interface Trip {
  id: string;
  name: string;
  status: string;
}

type TripsApiResponse =
  | {
      ok: boolean;
      message?: string;
      items?: Trip[];
      data?: Trip[] | { trips: Trip[] };
    }
  | any;

export default function AdminDashboard() {
  // === Trip dropdown (pola sama dengan halaman peserta) ===
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [loadingTrips, setLoadingTrips] = useState(false);

  // === Dashboard data ===
  const [tripName, setTripName] = useState<string>("Trip");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceItem[]>(
    []
  );
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Load trips untuk dropdown (ambil pola dari AdminParticipantsPage) ---
  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTrips() {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      const json: TripsApiResponse = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat trips");

      // support beberapa bentuk response:
      let list: Trip[] = [];
      if (Array.isArray(json.items)) {
        list = json.items;
      } else if (Array.isArray(json.data)) {
        list = json.data as Trip[];
      } else if (json.data?.trips && Array.isArray(json.data.trips)) {
        list = json.data.trips;
      }

      setTrips(list);

      // auto pilih trip pertama kalau belum ada yang dipilih
      if (!selectedTripId && list.length > 0) {
        setSelectedTripId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat trips",
        variant: "destructive",
      });
      setError(err.message || "Gagal memuat trips");
    } finally {
      setLoadingTrips(false);
    }
  }

  // --- Load dashboard per-trip (dipanggil ketika selectedTripId berubah) ---
  useEffect(() => {
    if (!selectedTripId) {
      // kalau belum ada trip yang dipilih, kosongkan dashboard
      setStats(null);
      setDailyAttendance([]);
      setRecentActivity([]);
      setTripName("Trip");
      setLoadingDashboard(false);
      return;
    }

    let isMounted = true;

    async function loadDashboard(tripId: string) {
      try {
        setLoadingDashboard(true);
        setError(null);

        const res = await fetch(
          `/api/dashboard?tripId=${encodeURIComponent(tripId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Gagal memuat dashboard");
        }

        const json: DashboardApiResponse = await res.json();

        if (!json.ok || !json.data) {
          throw new Error(json.message || "Gagal memuat dashboard");
        }

        if (!isMounted) return;

        setTripName(json.data.trip.name || "Trip");
        setStats(json.data.stats);
        setDailyAttendance(json.data.dailyAttendance || []);
        setRecentActivity(json.data.recentActivity || []);
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(err.message || "Terjadi kesalahan");
        setStats(null);
        setDailyAttendance([]);
        setRecentActivity([]);
      } finally {
        if (isMounted) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard(selectedTripId);

    return () => {
      isMounted = false;
    };
  }, [selectedTripId]);

  const maxCount =
    dailyAttendance.length > 0
      ? Math.max(...dailyAttendance.map((d) => d.count))
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Ringkasan perjalanan{" "}
            <span className="font-semibold">{tripName || "Trip"}</span>
          </p>

          {loadingDashboard && (
            <p className="text-sm text-slate-400 mt-2">
              Memuat data dashboard...
            </p>
          )}

          {error && !loadingDashboard && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}
        </div>

        {/* Dropdown trip — pola sama seperti di halaman peserta */}
        <div className="w-full md:w-72">
          <LabelDropdown />
          <Select
            value={selectedTripId}
            onValueChange={(v) => setSelectedTripId(v)}
          >
            <SelectTrigger id="trip-select-dashboard" className="w-full">
              <SelectValue
                placeholder={
                  loadingTrips
                    ? "Memuat trips..."
                    : "Pilih trip untuk melihat dashboard..."
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
          {trips.length === 0 && !loadingTrips && (
            <p className="text-xs text-slate-400 mt-1">
              Belum ada trip terdaftar.
            </p>
          )}
        </div>
      </div>

      {/* Kalau belum pilih trip */}
      {!selectedTripId ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500">
              Silakan pilih trip di kanan atas untuk melihat ringkasan
              dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Peserta
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats ? stats.totalParticipants : "-"}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Terdaftar dalam trip
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Agenda
                </CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats ? stats.totalAgenda : "-"}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sesi dalam perjalanan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Tingkat Kehadiran
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats ? `${stats.attendanceRate.toFixed(1)}%` : "-"}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Rata-rata kehadiran
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Foto di Galeri
                </CardTitle>
                <ImageIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stats ? stats.totalPhotos : "-"}
                </div>
                <p className="text-xs text-slate-500 mt-1">Telah di-approve</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Kehadiran per Hari
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyAttendance.length === 0 && !loadingDashboard ? (
                  <p className="text-sm text-slate-500">
                    Belum ada data kehadiran.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dailyAttendance.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {item.day}
                            </span>
                            <span className="text-slate-500">
                              ({item.date})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-900">
                              {item.count}/{item.total}
                            </span>
                            <span className="text-slate-500 ml-2">
                              ({item.percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{
                              width:
                                maxCount > 0
                                  ? `${(item.count / maxCount) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 && !loadingDashboard ? (
                  <p className="text-sm text-slate-500">
                    Belum ada aktivitas tercatat.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-blue-600">
                            {activity.user
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 font-medium">
                            {activity.user}
                          </p>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {activity.action}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Aksi Cepat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                  <div className="font-medium text-slate-900">
                    Tambah Jadwal Baru
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Buat agenda tambahan
                  </div>
                </button>
                <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                  <div className="font-medium text-slate-900">
                    Kirim Pengumuman
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Broadcast ke semua peserta
                  </div>
                </button>
                <button className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                  <div className="font-medium text-slate-900">
                    Export Laporan
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Download data kehadiran
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Label kecil di atas dropdown biar rapi, terpisah biar code utama nggak terlalu panjang
function LabelDropdown() {
  return (
    <label
      htmlFor="trip-select-dashboard"
      className="block text-xs font-medium text-slate-500 mb-1"
    >
      Pilih Trip
    </label>
  );
}
