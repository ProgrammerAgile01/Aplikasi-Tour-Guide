"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Map,
  Plane,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Trip {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
}

type FlightDirection = "DEPARTURE" | "RETURN";
type FlightPassengerRole = "PESERTA" | "TL_AGENT";

interface Flight {
  id: string;
  tripId: string;
  passengerName: string;
  role: FlightPassengerRole;
  orderId?: string | null;
  flightNumber1: string;
  flightNumber2?: string | null;
  airline1: string;
  airline2?: string | null;
  ticketNumber: string;
  direction: FlightDirection;
  notes?: string | null;
  createdAt: string;
}

const directionLabel: Record<FlightDirection, string> = {
  DEPARTURE: "Berangkat",
  RETURN: "Pulang",
};

const roleLabel: Record<FlightPassengerRole, string> = {
  PESERTA: "Peserta",
  TL_AGENT: "TL Agent",
};

const pageSize = 10;

export default function AdminFlightsPage() {
  const { toast } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [loadingTrips, setLoadingTrips] = useState(false);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(false);

  const [q, setQ] = useState("");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [saving, setSaving] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFlight, setDeletingFlight] = useState<Flight | null>(null);
  const [deleting, setDeleting] = useState(false);

  // form
  const [passengerName, setPassengerName] = useState("");
  const [role, setRole] = useState<FlightPassengerRole>("PESERTA");
  const [orderId, setOrderId] = useState("");
  const [flightNumber1, setFlightNumber1] = useState("");
  const [flightNumber2, setFlightNumber2] = useState("");
  const [airline1, setAirline1] = useState("");
  const [airline2, setAirline2] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [direction, setDirection] = useState<FlightDirection>("DEPARTURE");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setPassengerName("");
    setRole("PESERTA");
    setOrderId("");
    setFlightNumber1("");
    setFlightNumber2("");
    setAirline1("");
    setAirline2("");
    setTicketNumber("");
    setDirection("DEPARTURE");
    setNotes("");
  }

  function openCreateDialog() {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip Terlebih Dahulu",
        description: "Silakan pilih trip sebelum menambah data penerbangan.",
        variant: "destructive",
      });
      return;
    }
    setEditingFlight(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(f: Flight) {
    setEditingFlight(f);
    setPassengerName(f.passengerName);
    setRole(f.role);
    setOrderId(f.orderId || "");
    setFlightNumber1(f.flightNumber1);
    setFlightNumber2(f.flightNumber2 || "");
    setAirline1(f.airline1);
    setAirline2(f.airline2 || "");
    setTicketNumber(f.ticketNumber);
    setDirection(f.direction);
    setNotes(f.notes || "");
    setDialogOpen(true);
  }

  function openDeleteDialog(f: Flight) {
    setDeletingFlight(f);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeletingFlight(null);
  }

  async function loadTrips() {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat trips");

      const items: Trip[] = json.items ?? json.data ?? [];
      setTrips(items);

      if (!selectedTripId && items.length > 0) {
        setSelectedTripId(items[0].id);
      }
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

  async function loadFlights(tripId: string, options?: { silent?: boolean }) {
    if (!tripId) {
      setFlights([]);
      return;
    }
    try {
      if (!options?.silent) setLoadingFlights(true);

      const params = new URLSearchParams();
      params.set("tripId", tripId);
      if (q.trim()) params.set("q", q.trim());
      if (directionFilter !== "ALL") params.set("direction", directionFilter);
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const res = await fetch(`/api/flights?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(
          json?.error || json?.message || "Gagal memuat penerbangan"
        );

      setFlights(json.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat data penerbangan",
        variant: "destructive",
      });
    } finally {
      if (!options?.silent) setLoadingFlights(false);
    }
  }

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      setPage(1);
      loadFlights(selectedTripId);
    } else {
      setFlights([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId, q, directionFilter, roleFilter]);

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId),
    [trips, selectedTripId]
  );

  const stats = useMemo(() => {
    const total = flights.length;
    const departures = flights.filter(
      (f) => f.direction === "DEPARTURE"
    ).length;
    const returns = flights.filter((f) => f.direction === "RETURN").length;
    return { total, departures, returns };
  }, [flights]);

  // pagination
  const total = flights.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedFlights = flights.slice(start, end);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTripId) {
      toast({
        title: "Trip belum dipilih",
        description: "Pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!passengerName || !flightNumber1 || !airline1 || !ticketNumber) {
      toast({
        title: "Data belum lengkap",
        description:
          "Nama, pesawat 1, maskapai 1, dan nomor tiket wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tripId: selectedTripId,
        passengerName: passengerName.trim(),
        role,
        orderId: orderId.trim() || null,
        flightNumber1: flightNumber1.trim(),
        flightNumber2: flightNumber2.trim() || null,
        airline1: airline1.trim(),
        airline2: airline2.trim() || null,
        ticketNumber: ticketNumber.trim(),
        direction,
        notes: notes.trim() || null,
      };

      const url = editingFlight
        ? `/api/flights/${encodeURIComponent(editingFlight.id)}`
        : `/api/flights`;
      const method = editingFlight ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || json?.message || "Gagal menyimpan data");

      toast({
        title: editingFlight
          ? "Data penerbangan diperbarui"
          : "Data penerbangan ditambahkan",
        description: editingFlight
          ? "Informasi penerbangan berhasil diperbarui."
          : "Penerbangan baru berhasil disimpan.",
      });

      setDialogOpen(false);
      setEditingFlight(null);
      resetForm();
      await loadFlights(selectedTripId, { silent: true });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menyimpan data penerbangan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingFlight) return;
    try {
      setDeleting(true);

      const res = await fetch(
        `/api/flights/${encodeURIComponent(deletingFlight.id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || json?.message || "Gagal menghapus data");

      toast({
        title: "Data dihapus",
        description: `Data penerbangan atas nama "${deletingFlight.passengerName}" dipindahkan ke sampah.`,
      });

      setFlights((prev) => prev.filter((x) => x.id !== deletingFlight.id));
      setDeleteDialogOpen(false);
      setDeletingFlight(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus data penerbangan",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTripId) {
      toast({
        title: "Trip belum dipilih",
        description: "Pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    if (!importFile) {
      toast({
        title: "File belum dipilih",
        description: "Silakan pilih file Excel terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("tripId", selectedTripId);
      formData.append("file", importFile);

      const res = await fetch("/api/flights/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal import data penerbangan");
      }

      toast({
        title: "Import Berhasil",
        description: `Berhasil menambahkan ${json.inserted} baris. Terlewat: ${
          json.skipped ?? 0
        }.`,
      });

      setImportDialogOpen(false);
      setImportFile(null);
      await loadFlights(selectedTripId, { silent: true });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal import file Excel",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header utama */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-7 h-7 text-sky-600" />
            Data Penerbangan
          </h1>
          <p className="text-slate-600 mt-1">
            Kelola informasi penerbangan peserta dan TL Agent untuk setiap trip
          </p>
        </div>
      </div>

      {/* Pilih Trip */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Map className="text-blue-600" size={20} />
            <div className="flex-1">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Pilih Trip
              </Label>
              <Select
                value={selectedTripId}
                onValueChange={(v) => setSelectedTripId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingTrips
                        ? "Memuat trips..."
                        : "Pilih trip untuk melihat data penerbangan..."
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
                          {trip.status === "ongoing" ? "Aktif" : "Selesai"}
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

      {selectedTripId ? (
        <>
          {/* Stats ringkas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.total}
                    </p>
                    <p className="text-sm text-slate-600">Total Penerbangan</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Plane className="w-5 h-5 rotate-[-45deg] text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.departures}
                    </p>
                    <p className="text-sm text-slate-600">Berangkat</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Plane className="w-5 h-5 rotate-[135deg] text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.returns}
                    </p>
                    <p className="text-sm text-slate-600">Pulang</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Search + Filter */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="col-span-1 md:col-span-2">
                  <Label className="text-sm text-slate-600 mb-1 block">
                    Cari Penerbangan
                  </Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Cari nama, tiket, pesawat..."
                      className="pl-8"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </div>

                {/* Direction filter */}
                <div>
                  <Label className="text-sm text-slate-600 mb-1 block">
                    Arah Penerbangan
                  </Label>
                  <Select
                    value={directionFilter}
                    onValueChange={(val) => {
                      setDirectionFilter(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Arah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Arah</SelectItem>
                      <SelectItem value="DEPARTURE">Berangkat</SelectItem>
                      <SelectItem value="RETURN">Pulang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role filter */}
                <div>
                  <Label className="text-sm text-slate-600 mb-1 block">
                    Jenis Penumpang
                  </Label>
                  <Select
                    value={roleFilter}
                    onValueChange={(val) => {
                      setRoleFilter(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Role</SelectItem>
                      <SelectItem value="PESERTA">Peserta</SelectItem>
                      <SelectItem value="TL_AGENT">TL Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">
                <div className="flex justify-between flex-wrap gap-3">
                  <span>
                    Daftar Penerbangan{" "}
                    {currentTrip?.name && `• ${currentTrip.name}`}
                  </span>

                  {/* Button Excel dropdown + tambah */}
                  <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Excel</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <a
                            href="/api/flights/template"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4" />
                              <span>Download Template</span>
                            </div>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (!selectedTripId) {
                              toast({
                                title: "Pilih Trip Terlebih Dahulu",
                                description:
                                  "Silakan pilih trip sebelum import Excel.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setImportDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>Import Excel</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700 gap-1"
                      onClick={openCreateDialog}
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Penerbangan
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loadingFlights ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memuat data penerbangan...
                </div>
              ) : total === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  Belum ada data penerbangan untuk trip ini.
                  <br />
                  Klik <span className="font-semibold">Tambah</span> atau{" "}
                  <span className="font-semibold">Import Excel</span> untuk
                  mengisi.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            Nama
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            Role
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            ID Pesanan
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            Pesawat
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            Maskapai
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            No. Tiket
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-700">
                            Arah
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-700">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedFlights.map((f) => (
                          <tr
                            key={f.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium text-slate-900">
                                {f.passengerName}
                              </div>
                              {f.notes && (
                                <div className="text-xs text-slate-500 line-clamp-2">
                                  {f.notes}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                                {roleLabel[f.role]}
                              </span>
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-slate-700">
                              {f.orderId || "–"}
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-slate-700">
                              {f.flightNumber1}
                              {f.flightNumber2 && (
                                <>
                                  <br />
                                  <span className="text-slate-500">
                                    {f.flightNumber2}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-slate-700">
                              {f.airline1}
                              {f.airline2 && (
                                <>
                                  <br />
                                  <span className="text-slate-500">
                                    {f.airline2}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-slate-700">
                              {f.ticketNumber}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-[11px]">
                                {directionLabel[f.direction]}
                              </span>
                            </td>
                            <td className="px-3 py-2 align-top text-right">
                              <div className="inline-flex gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(f)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openDeleteDialog(f)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {total > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-600">
                      <div>
                        Menampilkan{" "}
                        <span className="font-semibold">
                          {start + 1}–{Math.min(end, total)}
                        </span>{" "}
                        dari <span className="font-semibold">{total}</span> data
                        penerbangan
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
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={safePage >= totalPages}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Dialog Tambah/Edit */}
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingFlight(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>
                  {editingFlight
                    ? "Edit Data Penerbangan"
                    : "Tambah Data Penerbangan"}
                </DialogTitle>
                <DialogDescription>
                  Isi informasi penerbangan peserta atau TL Agent secara
                  lengkap.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nama</Label>
                    <Input
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      required
                      placeholder="Nama peserta / TL Agent"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select
                      value={role}
                      onValueChange={(v: FlightPassengerRole) => setRole(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PESERTA">Peserta</SelectItem>
                        <SelectItem value="TL_AGENT">TL Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>ID Pesanan</Label>
                    <Input
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nomor Tiket</Label>
                    <Input
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      required
                      placeholder="Nomor tiket"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Pesawat 1</Label>
                    <Input
                      value={flightNumber1}
                      onChange={(e) => setFlightNumber1(e.target.value)}
                      required
                      placeholder="Mis. GA-123"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pesawat 2 (opsional)</Label>
                    <Input
                      value={flightNumber2}
                      onChange={(e) => setFlightNumber2(e.target.value)}
                      placeholder="Pesawat transit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Maskapai 1</Label>
                    <Input
                      value={airline1}
                      onChange={(e) => setAirline1(e.target.value)}
                      required
                      placeholder="Mis. Garuda Indonesia"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Maskapai 2 (opsional)</Label>
                    <Input
                      value={airline2}
                      onChange={(e) => setAirline2(e.target.value)}
                      placeholder="Maskapai transit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Berangkat / Pulang</Label>
                    <Select
                      value={direction}
                      onValueChange={(v: FlightDirection) => setDirection(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPARTURE">Berangkat</SelectItem>
                        <SelectItem value="RETURN">Pulang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Catatan (opsional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan khusus, kursi, connecting flight, dsb."
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingFlight(null);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingFlight ? "Simpan Perubahan" : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog Import Excel */}
          <Dialog
            open={importDialogOpen}
            onOpenChange={(open) => {
              if (!importing) {
                setImportDialogOpen(open);
                if (!open) setImportFile(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Import Data Penerbangan dari Excel</DialogTitle>
                <DialogDescription>
                  Upload file Excel (.xlsx / .xls) dengan format kolom yang
                  sesuai.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleImportSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>File Excel</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-slate-500">
                    Pastikan header (baris pertama) menggunakan nama kolom:
                    <br />
                    <span className="font-mono">
                      Nama, Role, OrderId, Pesawat1, Pesawat2, Maskapai1,
                      Maskapai2, NomorTiket, Arah, Catatan
                    </span>
                  </p>
                  <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 mt-1">
                    <li>
                      <b>Role</b>: PESERTA / TL_AGENT (boleh ditulis Peserta,
                      TL, TL Agent)
                    </li>
                    <li>
                      <b>Arah</b>: DEPARTURE / RETURN (boleh "Berangkat" /
                      "Pulang")
                    </li>
                    <li>
                      Baris tanpa <b>Nama, Pesawat1, Maskapai1, NomorTiket</b>{" "}
                      akan dilewati.
                    </li>
                  </ul>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!importing) {
                        setImportDialogOpen(false);
                        setImportFile(null);
                      }
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={importing}>
                    {importing && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Import
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog Konfirmasi Hapus */}
          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeDeleteDialog();
              }
            }}
          >
            <DialogContent className="sm:max-w-[420px] backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-red-100/60 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  Hapus Data Penerbangan
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                <p>
                  Apakah Anda yakin ingin menghapus data penerbangan atas nama{" "}
                  <span className="font-semibold text-red-600">
                    {deletingFlight?.passengerName ?? "ini"}
                  </span>
                  ?
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Data ini tidak akan dihapus permanen, tetapi akan{" "}
                  <span className="font-semibold">dipindahkan ke sampah</span>.
                </p>
              </div>
              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="bg-gradient-to-r from-red-500 to-rose-500 text-white hover:opacity-90 flex items-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Hapus
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Plane className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500 text-sm">
              Setelah memilih trip, data penerbangan peserta dan TL Agent akan
              ditampilkan di sini
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
