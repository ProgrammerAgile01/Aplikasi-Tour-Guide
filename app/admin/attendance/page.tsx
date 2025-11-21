"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  MapPin,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AttendanceRecord {
  id: string;
  participantName: string;
  sessionTitle: string;
  location: string;
  method: "geo" | "qr" | "admin";
  timestamp: string;
  status: "present" | "absent";
}

interface TripRow {
  id: string;
  name: string;
  status: string; // "ongoing" | "completed"
}

interface SessionRow {
  id: string;
  title: string;
}

interface MissingParticipant {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  lastCheckIn?: string | null;
  totalCheckIns: number;
}

const pageSize = 15; // jumlah baris per halaman

export default function AdminAttendancePage() {
  // ====== Trip & Session state for QR panel ======
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrExpiresAt, setQrExpiresAt] = useState<string>("");

  // ====== Existing filters / table state ======
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  // pagination state
  const [page, setPage] = useState(1);

  // modal peserta belum presensi
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingParticipants, setMissingParticipants] = useState<
    MissingParticipant[]
  >([]);

  /* ----------------------------------------------------------------
   * 1. LOAD TRIPS SEKALI SAAT MOUNT
   * ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trips?take=100", { cache: "no-store" });
        const j = await res.json();
        if (!res.ok || !j?.ok)
          throw new Error(j?.message || "Gagal memuat trip");

        const list: TripRow[] = j.items ?? [];
        setTrips(list);

        // set default trip kalau mau
        if (!selectedTripId && list.length > 0) {
          setSelectedTripId(list[0].id);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Gagal memuat trip",
          variant: "destructive",
        });
      }
    })();
  }, [toast, selectedTripId]);

  /* ----------------------------------------------------------------
   * 2. LOAD SESSIONS SAAT TRIP DIGANTI
   * ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      // reset dulu
      setSessions([]);
      setSelectedSessionId("");
      setQrDataUrl("");
      setQrExpiresAt("");

      if (!selectedTripId) return;

      try {
        const res = await fetch(
          `/api/trips/${encodeURIComponent(selectedTripId)}/sessions`,
          { cache: "no-store" }
        );
        const j = await res.json();
        if (!res.ok || !j?.ok)
          throw new Error(j?.message || "Gagal memuat agenda");

        const list: SessionRow[] = j.items ?? [];
        setSessions(list);
        setSelectedSessionId(list[0]?.id ?? "");
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Gagal memuat agenda",
          variant: "destructive",
        });
      }
    })();
  }, [selectedTripId, toast]);

  /* ----------------------------------------------------------------
   * 3. ISSUE QR TIAP 60 DETIK (JIKA TRIP & SESI TERPILIH)
   * ---------------------------------------------------------------- */
  useEffect(() => {
    let stop = false;
    let timer: any;

    async function issue() {
      if (!selectedTripId || !selectedSessionId) {
        setQrDataUrl("");
        setQrExpiresAt("");
        return;
      }
      try {
        const res = await fetch("/api/checkins/qr/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: selectedTripId,
            sessionId: selectedSessionId,
          }),
        });
        const j = await res.json();
        if (!res.ok || !j?.ok)
          throw new Error(j?.message || "Gagal membuat QR");
        const { qrPayload, qrUrl, expiresAt } = j.data;

        // fallback: kalau backend lama masih pakai qrUrl
        const contentForQR = qrPayload || qrUrl;

        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(contentForQR, {
          margin: 1,
          scale: 6,
        });

        if (!stop) {
          setQrDataUrl(dataUrl);
          setQrExpiresAt(expiresAt);
        }
      } catch {
        // boleh diam saja biar UI tidak berisik
      }
    }

    issue();
    timer = setInterval(issue, 60_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [selectedTripId, selectedSessionId]);

  /* ----------------------------------------------------------------
   * 4. LOAD ATTENDANCE LIST BY TRIP & METHOD
   * ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      if (!selectedTripId) return;
      try {
        const url = `/api/attendance?tripId=${encodeURIComponent(
          selectedTripId
        )}&method=${encodeURIComponent(filterMethod)}`;
        const res = await fetch(url, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok || !j?.ok)
          throw new Error(j?.message || "Gagal memuat absensi");
        setAttendanceRecords(j.items || []);
        setPage(1); // reset halaman tiap kali data dari server berubah
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Gagal memuat absensi",
          variant: "destructive",
        });
      }
    })();
  }, [selectedTripId, filterMethod, toast]);

  // reset page kalau filter/text berubah (supaya tidak nyangkut di halaman besar)
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterLocation]);

  const loadMissingParticipants = async () => {
    if (!selectedTripId || !selectedSessionId) {
      toast({
        title: "Pilih Trip & Agenda",
        description:
          "Silakan pilih trip dan agenda terlebih dahulu sebelum melihat peserta yang belum presensi.",
        variant: "destructive",
      });
      return;
    }

    try {
      setMissingLoading(true);
      const url = `/api/attendance/missing?tripId=${encodeURIComponent(
        selectedTripId
      )}&sessionId=${encodeURIComponent(selectedSessionId)}`;

      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.ok)
        throw new Error(j?.message || "Gagal memuat peserta");

      setMissingParticipants(j.items || []);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Gagal memuat peserta yang belum presensi",
        variant: "destructive",
      });
    } finally {
      setMissingLoading(false);
    }
  };

  const handleAdminCheckin = async (participantId: string) => {
    if (!selectedTripId || !selectedSessionId) {
      toast({
        title: "Pilih Trip & Agenda",
        description: "Trip dan agenda harus dipilih dulu.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/checkins/admin/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          sessionId: selectedSessionId,
          participantId,
        }),
      });

      const j = await res.json();
      if (!res.ok || !j?.ok)
        throw new Error(j?.message || "Gagal menyimpan absensi manual");

      toast({
        title: "Absensi Tercatat",
        description: "Peserta berhasil ditandai hadir oleh admin.",
      });

      // hapus dari daftar "belum presensi"
      setMissingParticipants((prev) =>
        prev.filter((p) => p.id !== participantId)
      );

      // refresh tabel attendance utama (diam-diam)
      try {
        const url = `/api/attendance?tripId=${encodeURIComponent(
          selectedTripId
        )}&method=${encodeURIComponent(filterMethod)}`;
        const res2 = await fetch(url, { cache: "no-store" });
        const j2 = await res2.json();
        if (res2.ok && j2?.ok) {
          setAttendanceRecords(j2.items || []);
          setPage(1);
        }
      } catch {
        // ignore
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Gagal absensi manual peserta",
        variant: "destructive",
      });
    }
  };

  const locations = useMemo(
    () => [
      "all",
      ...Array.from(new Set(attendanceRecords.map((r) => r.location))),
    ],
    [attendanceRecords]
  );

  // filter search + method + location
  const filteredRecords = attendanceRecords.filter((record) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      record.participantName.toLowerCase().includes(q) ||
      record.sessionTitle.toLowerCase().includes(q) ||
      record.location.toLowerCase().includes(q);

    const matchesMethod =
      filterMethod === "all" || record.method === filterMethod;
    const matchesLocation =
      filterLocation === "all" || record.location === filterLocation;

    return matchesSearch && matchesMethod && matchesLocation;
  });

  // pagination logic
  const totalFiltered = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedRecords = filteredRecords.slice(start, end);

  const stats = {
    total: filteredRecords.length,
    geo: filteredRecords.filter((r) => r.method === "geo").length,
    qr: filteredRecords.filter((r) => r.method === "qr").length,
    admin: filteredRecords.filter((r) => r.method === "admin").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Absensi & Kehadiran
        </h1>
        <p className="text-slate-600 mt-1">
          Rekap kehadiran peserta per lokasi dan waktu
        </p>
      </div>

      {/* QR Panel per Trip + Agenda */}
      <Card>
        <CardHeader>
          <CardTitle>QR Presensi Per Trip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Pilih Trip</p>
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih trip" />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem value={t.id} key={t.id}>
                      <div className="flex items-center gap-2">
                        <span>{t.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            t.status === "ongoing"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {t.status === "ongoing" ? "Aktif" : "Selesai"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Pilih Agenda</p>
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih agenda" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem value={s.id} key={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setSelectedSessionId(selectedSessionId)}
                disabled={
                  !selectedTripId || !selectedSessionId || sessions.length === 0
                }
              >
                <QrCode size={16} />
                Refresh Sekarang
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {qrDataUrl && selectedSessionId ? (
              <>
                <img
                  src={qrDataUrl}
                  alt="QR Presensi"
                  className="w-56 h-56 rounded-xl border p-2 bg-white"
                />
                <p className="text-xs text-slate-500">
                  Pindai untuk konfirmasi kehadiran · Kedaluwarsa:{" "}
                  {qrExpiresAt
                    ? new Date(qrExpiresAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {selectedTripId
                  ? "Pilih agenda terlebih dahulu"
                  : "Pilih trip terlebih dahulu"}
              </p>
            )}
          </div>

          <div className="flex justify-center mt-3">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!selectedTripId || !selectedSessionId}
              onClick={async () => {
                setMissingOpen(true);
                await loadMissingParticipants();
              }}
            >
              <Users size={16} />
              Lihat Peserta Belum Presensi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-600 mt-1">Total Check-in</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.geo}</p>
              <p className="text-sm text-slate-600 mt-1">Via GEO</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.qr}</p>
              <p className="text-sm text-slate-600 mt-1">Via QR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-600">{stats.admin}</p>
              <p className="text-sm text-slate-600 mt-1">Manual Admin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <Input
                placeholder="Cari peserta atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="geo">GEO Check</SelectItem>
                <SelectItem value="qr">Scan QR</SelectItem>
                <SelectItem value="admin">Admin Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {locations
                  .filter((l) => l !== "all")
                  .map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap Kehadiran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Nama
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Agenda
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Lokasi
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Metode
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Waktu
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {record.participantName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {record.sessionTitle}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} />
                        {record.location}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.method === "geo" ? (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                          GEO
                        </span>
                      ) : record.method === "qr" ? (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                          QR
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={14} />
                        {record.timestamp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.status === "present" ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 size={16} />
                          Hadir
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <XCircle size={16} />
                          Tidak Hadir
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Belum ada data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {filteredRecords.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-600">
              <div>
                Menampilkan{" "}
                <span className="font-semibold">
                  {start + 1}–{Math.min(end, filteredRecords.length)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold">{filteredRecords.length}</span>{" "}
                check-in
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Sebelumnya
                </Button>
                <span>
                  Halaman{" "}
                  <span className="font-semibold">
                    {safePage}/{totalPages}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Peserta belum presensi */}
      <Dialog open={missingOpen} onOpenChange={setMissingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Peserta yang Belum Presensi</DialogTitle>
            <DialogDescription>
              Daftar peserta trip yang belum melakukan presensi pada agenda yang
              dipilih. Admin dapat menandai hadir secara manual jika diperlukan.
            </DialogDescription>
          </DialogHeader>

          {(!selectedTripId || !selectedSessionId) && (
            <p className="text-sm text-red-500">
              Pilih trip dan agenda terlebih dahulu.
            </p>
          )}

          {selectedTripId && selectedSessionId && (
            <div className="mt-3 space-y-3">
              {missingLoading ? (
                <p className="text-sm text-slate-500">
                  Memuat daftar peserta...
                </p>
              ) : missingParticipants.length === 0 ? (
                <p className="text-sm text-green-600">
                  Semua peserta sudah melakukan presensi untuk agenda ini 🎉
                </p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">
                          Nama
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">
                          WhatsApp
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">
                          Terakhir Check-in
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingParticipants.map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {p.whatsapp}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-xs">
                            {p.lastCheckIn || "-"}
                          </td>
                          <td className="py-2 px-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleAdminCheckin(p.id)}
                            >
                              Tandai Hadir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
