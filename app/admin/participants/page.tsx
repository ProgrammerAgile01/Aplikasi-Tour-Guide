"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Map,
  Loader2,
  Copy,
  Send,
  IdCard,
  FileSpreadsheet,
} from "lucide-react";
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

interface Participant {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  note?: string | null;
  nik?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null; // ISO string dari API
  gender?: "MALE" | "FEMALE" | null;
  roomNumber?: string | null;
  lastCheckIn?: string | null;
  totalCheckIns: number;
  tripId: string;
  createdAt?: string;
}

interface Trip {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
}

const pageSize = 10; // jumlah peserta per halaman

export default function AdminParticipantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    address: "",
    note: "",
    nik: "",
    birthPlace: "",
    birthDate: "", // "YYYY-MM-DD"
    gender: "", // "MALE" | "FEMALE"
    roomNumber: "",
  });

  const [trips, setTrips] = useState<Trip[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // pagination state
  const [page, setPage] = useState(1);

  // delete modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // credential modal (show plain password once)
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [lastCreatedCredential, setLastCreatedCredential] = useState<{
    username: string;
    password?: string;
  } | null>(null);

  const [sendAllDialogOpen, setSendAllDialogOpen] = useState(false);
  const [sendSingleDialogOpen, setSendSingleDialogOpen] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [selectedForSend, setSelectedForSend] = useState<Participant | null>(
    null
  );

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedForDetail, setSelectedForDetail] =
    useState<Participant | null>(null);

  const [exporting, setExporting] = useState(false);

  const openDetailDialog = (p: Participant) => {
    setSelectedForDetail(p);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedForDetail(null);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      // setiap ganti trip, reset ke halaman 1
      setPage(1);
      loadParticipants(selectedTripId);
    } else {
      setParticipants([]);
    }
  }, [selectedTripId]);

  // kalau keyword search berubah, reset ke halaman 1
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

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

  async function loadParticipants(tripId: string) {
    setLoadingParticipants(true);
    try {
      const res = await fetch(
        `/api/participants?tripId=${encodeURIComponent(tripId)}&take=1000`
      );
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat peserta");
      setParticipants(json.items ?? json.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat peserta",
        variant: "destructive",
      });
    } finally {
      setLoadingParticipants(false);
    }
  }

  async function createParticipantApi(payload: {
    name: string;
    whatsapp: string;
    address: string;
    note?: string;
    nik?: string;
    birthPlace?: string;
    birthDate?: string;
    gender?: string;
    roomNumber?: string;
    tripId: string;
  }) {
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function updateParticipantApi(
    id: string,
    payload: {
      name: string;
      whatsapp: string;
      address: string;
      note?: string;
      nik?: string;
      birthPlace?: string;
      birthDate?: string;
      gender?: string;
      roomNumber?: string;
    }
  ) {
    const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function deleteParticipantApi(id: string) {
    const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.json();
  }

  // filter global (search + trip)
  const filteredParticipants = participants.filter((p) => {
    const matchesTrip = !selectedTripId || p.tripId === selectedTripId;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.whatsapp.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.note && p.note.toLowerCase().includes(q)) ||
      (p.nik && p.nik.toLowerCase().includes(q)) ||
      (p.birthPlace && p.birthPlace.toLowerCase().includes(q)) ||
      (p.roomNumber && p.roomNumber.toLowerCase().includes(q));
    return matchesTrip && matchesSearch;
  });

  // clamp page kalau jumlah data berubah
  const totalFiltered = filteredParticipants.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedParticipants = filteredParticipants.slice(start, end);

  const stats = {
    total: filteredParticipants.length,
    present: filteredParticipants.filter((p) => p.lastCheckIn).length,
    absent: filteredParticipants.filter((p) => !p.lastCheckIn).length,
  };

  const currentTrip = trips.find((t) => t.id === selectedTripId);

  const handleOpenDialog = (participant?: Participant) => {
    if (!selectedTripId && !participant) {
      toast({
        title: "Pilih Trip Terlebih Dahulu",
        description: "Silakan pilih trip untuk menambah peserta.",
        variant: "destructive",
      });
      return;
    }
    if (participant) {
      setEditingId(participant.id);
      setFormData({
        name: participant.name,
        whatsapp: participant.whatsapp,
        address: participant.address,
        note: participant.note ?? "",
        nik: participant.nik ?? "",
        birthPlace: participant.birthPlace ?? "",
        birthDate: participant.birthDate
          ? participant.birthDate.slice(0, 10) // "YYYY-MM-DD"
          : "",
        gender: participant.gender ?? "",
        roomNumber: participant.roomNumber ?? "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        whatsapp: "",
        address: "",
        note: "",
        nik: "",
        birthPlace: "",
        birthDate: "",
        gender: "",
        roomNumber: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      whatsapp: "",
      address: "",
      note: "",
      nik: "",
      birthPlace: "",
      birthDate: "",
      gender: "",
      roomNumber: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.whatsapp || !formData.address) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Mohon lengkapi semua field yang diperlukan.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editingId) {
        const json = await updateParticipantApi(editingId, formData);
        if (!json.ok) throw new Error(json.message || "Gagal update");
        setParticipants((prev) =>
          prev.map((p) => (p.id === editingId ? json.item : p))
        );
        toast({
          title: "Peserta Diperbarui",
          description: "Data peserta berhasil diperbarui.",
        });
      } else {
        const json = await createParticipantApi({
          ...formData,
          tripId: selectedTripId,
        });
        if (!json.ok) throw new Error(json.message || "Gagal tambah peserta");
        setParticipants((prev) => [...prev, json.participant]);
        toast({
          title: "Peserta Ditambahkan",
          description: "Peserta baru berhasil ditambahkan.",
        });

        if (json.user?.plainPassword || json.participant?.initialPassword) {
          setLastCreatedCredential({
            username:
              json.user?.username ?? json.participant?.loginUsername ?? "",
            password:
              json.user?.plainPassword ??
              json.participant?.initialPassword ??
              "",
          });
          setCredentialModalOpen(true);
        }
      }
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menyimpan peserta",
        variant: "destructive",
      });
    }
  };

  const openDeleteModal = (p: { id: string; name?: string }) => {
    setDeletingParticipant(p);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingParticipant) return;
    setIsDeleting(true);
    try {
      const json = await deleteParticipantApi(deletingParticipant.id);
      if (!json.ok) throw new Error(json.message || "Gagal hapus");
      setParticipants((prev) =>
        prev.filter((x) => x.id !== deletingParticipant.id)
      );
      toast({
        title: "Peserta Dihapus",
        description: `Peserta "${
          deletingParticipant.name ?? deletingParticipant.id
        }" berhasil dihapus.`,
      });
      setDeleteDialogOpen(false);
      setDeletingParticipant(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus peserta",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingParticipant(null);
  };

  // --- Buka modal kirim akun untuk semua peserta di trip ---
  const openSendAllDialog = () => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip",
        description: "Silakan pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (filteredParticipants.length === 0) {
      toast({
        title: "Tidak Ada Peserta",
        description: "Belum ada peserta di trip ini.",
      });
      return;
    }

    setSendAllDialogOpen(true);
  };

  const confirmSendAll = async () => {
    if (!selectedTripId) return;
    setSendingAll(true);
    try {
      const res = await fetch("/api/participants/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: selectedTripId }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal mengirim akun ke peserta");
      }

      toast({
        title: "Berhasil Diantrikan",
        description: `Akun dikirim ke ${json.sentCount} peserta. Terlewati (sudah pernah dikirim): ${json.skippedAlreadySent}. Gagal: ${json.failedCount}.`,
      });

      setSendAllDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal mengirim akun ke peserta",
        variant: "destructive",
      });
    } finally {
      setSendingAll(false);
    }
  };

  // --- Kirim akun per peserta ---
  const openSendSingleDialog = (p: Participant) => {
    setSelectedForSend(p);
    setSendSingleDialogOpen(true);
  };

  const confirmSendSingle = async () => {
    if (!selectedForSend) return;
    setSendingSingle(true);
    try {
      const res = await fetch(
        `/api/participants/${encodeURIComponent(
          selectedForSend.id
        )}/send-credentials`,
        {
          method: "POST",
        }
      );
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal mengirim akun peserta");
      }

      if (json.alreadySent) {
        toast({
          title: "Sudah Pernah Dikirim",
          description:
            json.message ||
            `Akun untuk ${selectedForSend.name} sudah pernah dikirim sebelumnya.`,
        });
      } else {
        toast({
          title: "Berhasil Diantrikan",
          description:
            json.message ||
            `Akun untuk ${selectedForSend.name} berhasil diantrikan ke WhatsApp.`,
        });
      }

      setSendSingleDialogOpen(false);
      setSelectedForSend(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal mengirim akun peserta",
        variant: "destructive",
      });
    } finally {
      setSendingSingle(false);
    }
  };

  function calculateAge(birthDateStr?: string | null): number | null {
    if (!birthDateStr) return null;
    const d = new Date(birthDateStr);
    if (Number.isNaN(d.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  async function handleExportExcel() {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip Terlebih Dahulu",
        description: "Silakan pilih trip sebelum export peserta.",
        variant: "destructive",
      });
      return;
    }

    if (filteredParticipants.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Belum ada peserta untuk di-export.",
      });
      return;
    }

    try {
      setExporting(true);

      const res = await fetch(
        `/api/participants/export?tripId=${encodeURIComponent(selectedTripId)}`,
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        let msg = "Gagal mengunduh file Excel peserta";
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

      const rawName = currentTrip?.name || "trip";
      const safeName = rawName.replace(/[\\/:*?"<>|]/g, "_");
      const filename = `peserta-${safeName}.xlsx`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Berhasil",
        description: "File Excel peserta berhasil diunduh.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal export data peserta ke Excel",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Peserta</h1>
          <p className="text-slate-600 mt-1">Kelola data peserta perjalanan</p>
        </div>
      </div>

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
                        : "Pilih trip untuk melihat peserta..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.total}
                    </p>
                    <p className="text-sm text-slate-600">Total Peserta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.present}
                    </p>
                    <p className="text-sm text-slate-600">Sudah Check-in</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.absent}
                    </p>
                    <p className="text-sm text-slate-600">Belum Check-in</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <Input
                  placeholder="Cari peserta berdasarkan nama, nomor WA, atau alamat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <CardTitle className="text-lg md:text-xl">
                  Daftar Peserta
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={filteredParticipants.length === 0 || exporting}
                    className="gap-2"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    Export Excel
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={openSendAllDialog}
                    disabled={filteredParticipants.length === 0}
                    className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Send size={16} />
                    Kirim Akun ke Semua Peserta
                  </Button>

                  <Button
                    onClick={() => handleOpenDialog()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} /> Tambah Peserta
                  </Button>
                </div>
              </div>
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
                        Nomor WhatsApp
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Jenis Kelamin
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Alamat
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Status Kehadiran Terakhir
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Catatan
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingParticipants ? (
                      <tr>
                        <td colSpan={6} className="py-4 px-4">
                          Memuat peserta…
                        </td>
                      </tr>
                    ) : filteredParticipants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-slate-500"
                        >
                          Tidak ada peserta
                        </td>
                      </tr>
                    ) : (
                      pagedParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {participant.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {participant.whatsapp}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {participant.gender === "MALE"
                              ? "L"
                              : participant.gender === "FEMALE"
                              ? "P"
                              : "-"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {participant.address}
                          </td>
                          <td className="py-3 px-4">
                            {participant.lastCheckIn ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2
                                  size={16}
                                  className="text-green-600"
                                />
                                <span className="text-sm text-slate-700">
                                  {participant.lastCheckIn}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <XCircle size={16} className="text-red-600" />
                                <span className="text-sm text-slate-500">
                                  Belum hadir
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {participant.note ?? "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDetailDialog(participant)}
                                className="gap-1"
                              >
                                <IdCard size={14} /> Detail
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(participant)}
                                className="gap-1"
                              >
                                <Pencil size={14} /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openDeleteModal({
                                    id: participant.id,
                                    name: participant.name,
                                  })
                                }
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} /> Hapus
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openSendSingleDialog(participant)
                                }
                                className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Send size={14} /> Kirim Akun
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {filteredParticipants.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-600">
                  <div>
                    Menampilkan{" "}
                    <span className="font-semibold">
                      {start + 1}–{Math.min(end, filteredParticipants.length)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold">
                      {filteredParticipants.length}
                    </span>{" "}
                    peserta
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
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500">
              Silakan pilih trip di atas untuk melihat dan mengelola peserta.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Peserta" : "Tambah Peserta Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Perbarui informasi peserta di bawah ini"
                : "Masukkan informasi peserta baru di bawah ini"}
            </DialogDescription>
          </DialogHeader>

          {/* === SCROLLABLE FORM === */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK / Nomor Identitas</Label>
                  <Input
                    id="nik"
                    placeholder="Contoh: 3271xxxxxxxxxxxx"
                    value={formData.nik}
                    onChange={(e) =>
                      setFormData({ ...formData, nik: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Nomor WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    placeholder="Contoh: 0812345584"
                    value={formData.whatsapp}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Tempat Lahir</Label>
                  <Input
                    id="birthPlace"
                    placeholder="Contoh: Jakarta"
                    value={formData.birthPlace}
                    onChange={(e) =>
                      setFormData({ ...formData, birthPlace: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Tanggal Lahir</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="gender"
                        value="MALE"
                        checked={formData.gender === "MALE"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className="h-4 w-4"
                      />
                      <span>Laki-laki</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="gender"
                        value="FEMALE"
                        checked={formData.gender === "FEMALE"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className="h-4 w-4"
                      />
                      <span>Perempuan</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Nomor Kamar (opsional)</Label>
                  <Input
                    id="roomNumber"
                    placeholder="Contoh: 302 / B-12"
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea
                  id="address"
                  placeholder="Contoh: Jl. Sudirman No. 123, Jakarta Pusat"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Catatan (opsional)</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* === FIXED FOOTER === */}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5 text-red-500" /> Konfirmasi Hapus
              Peserta
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Apakah Anda yakin ingin menghapus peserta{" "}
              <span className="font-semibold text-red-600">
                {deletingParticipant?.name ?? "ini"}
              </span>
              ?
            </p>
            <p className="mt-1 text-gray-500 text-xs">
              Data peserta ini akan dipindahkan ke sampah.
            </p>
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:opacity-90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}{" "}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credential modal */}
      <Dialog open={credentialModalOpen} onOpenChange={setCredentialModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Kredensial Akun Baru</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-slate-700">
              Akun peserta baru berhasil dibuat. Simpan credential ini dan kirim
              ke peserta (ditampilkan sekali saja).
            </p>
            <div className="mt-4 bg-slate-50 p-4 rounded">
              <p className="text-xs text-slate-500">Username</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm">
                  {lastCreatedCredential?.username}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      lastCreatedCredential?.username ?? ""
                    );
                    toast({ title: "Copied", description: "Username disalin" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Password</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm">
                  {lastCreatedCredential?.password ?? "—"}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      lastCreatedCredential?.password ?? ""
                    );
                    toast({ title: "Copied", description: "Password disalin" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Sebaiknya minta peserta mengganti password setelah login
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Kirim akun ke semua peserta - modal konfirmasi */}
      <Dialog
        open={sendAllDialogOpen}
        onOpenChange={(open) => {
          if (!sendingAll) setSendAllDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-white/90 border border-emerald-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-5 h-5 text-emerald-500" />
              Kirim Akun ke Semua Peserta
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Pesan akun login akan dikirim ke WhatsApp seluruh peserta di trip
              ini menggunakan template yang sudah Anda siapkan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Trip</span>
              <span className="font-semibold text-slate-800">
                {currentTrip?.name ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Jumlah Peserta</span>
              <span className="font-semibold text-slate-800">
                {filteredParticipants.length} orang
              </span>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
              <p className="font-semibold">Catatan:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  Tombol ini akan mengirim informasi akun ke seluruh peserta di
                  trip ini
                </li>
                <li>Proses pengiriman dilakukan melalui antrean WhatsApp</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setSendAllDialogOpen(false)}
              disabled={sendingAll}
            >
              Batal
            </Button>
            <Button
              onClick={confirmSendAll}
              disabled={sendingAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {sendingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Kirim Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kirim akun ke satu peserta - modal konfirmasi */}
      <Dialog
        open={sendSingleDialogOpen}
        onOpenChange={(open) => {
          if (!sendingSingle) setSendSingleDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px] backdrop-blur-xl bg-white/90 border border-sky-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-5 h-5 text-sky-500" />
              Kirim Akun Peserta
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Pesan akun login akan dikirim ke peserta ini melalui WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Nama Peserta</span>
              <span className="font-semibold text-slate-800">
                {selectedForSend?.name ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">No. WhatsApp</span>
              <span className="font-mono text-slate-800">
                {selectedForSend?.whatsapp ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Trip</span>
              <span className="font-semibold text-slate-800">
                {currentTrip?.name ?? "-"}
              </span>
            </div>
            <div className="rounded-md bg-sky-50 border border-sky-100 px-3 py-2 text-xs text-sky-800">
              <p className="font-semibold">Catatan:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  Anda dapat menggunakan tombol ini kapan saja untuk mengiri
                  informasi akun ke peserta
                </li>
                <li>
                  Untuk peserta baru, username & password akan dibuat otomatis
                  bila belum ada.
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setSendSingleDialogOpen(false)}
              disabled={sendingSingle}
            >
              Batal
            </Button>
            <Button
              onClick={confirmSendSingle}
              disabled={sendingSingle}
              className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
            >
              {sendingSingle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Kirim via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Peserta - modal view only */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDetailDialog();
          else if (!selectedForDetail) setDetailDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="w-5 h-5 text-sky-500" />
              Detail Peserta
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {selectedForDetail && (
              <div className="space-y-6 py-2 text-sm">
                {/* Header identitas utama */}
                <div className="rounded-xl border bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Nama Lengkap
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedForDetail.name}
                    </p>
                    {selectedForDetail.gender && (
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedForDetail.gender === "MALE"
                          ? "Laki-laki"
                          : "Perempuan"}
                        {(() => {
                          const age = calculateAge(selectedForDetail.birthDate);
                          return age !== null ? `, ${age} tahun` : "";
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Trip</p>
                    <p className="font-medium text-slate-800">
                      {currentTrip?.name ?? "-"}
                    </p>
                    <p className="mt-1">
                      Terakhir check-in:{" "}
                      <span className="font-medium text-slate-800">
                        {selectedForDetail.lastCheckIn ?? "Belum pernah"}
                      </span>
                    </p>
                    <p>
                      Total check-in:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedForDetail.totalCheckIns}
                      </span>
                    </p>
                    {selectedForDetail.roomNumber && (
                      <p className="mt-1">
                        Nomor kamar:{" "}
                        <span className="font-semibold">
                          {selectedForDetail.roomNumber}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Dua kolom seperti lembar paspor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom kiri: Data Identitas */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Data Identitas
                    </h3>
                    <div className="rounded-xl border bg-white px-4 py-3 space-y-2">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">
                          NIK / No. Identitas
                        </span>
                        <span className="font-medium text-slate-900 text-right break-all">
                          {selectedForDetail.nik || "—"}
                        </span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">
                          Tempat, Tanggal Lahir
                        </span>
                        <span className="font-medium text-slate-900 text-right">
                          {selectedForDetail.birthPlace ||
                          selectedForDetail.birthDate
                            ? `${selectedForDetail.birthPlace ?? ""}${
                                selectedForDetail.birthPlace &&
                                selectedForDetail.birthDate
                                  ? ", "
                                  : ""
                              }${
                                selectedForDetail.birthDate
                                  ? new Date(
                                      selectedForDetail.birthDate
                                    ).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "long",
                                      year: "numeric",
                                    })
                                  : ""
                              }`
                            : "—"}
                        </span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Jenis Kelamin</span>
                        <span className="font-medium text-slate-900">
                          {selectedForDetail.gender === "MALE"
                            ? "Laki-laki"
                            : selectedForDetail.gender === "FEMALE"
                            ? "Perempuan"
                            : "—"}
                        </span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Umur</span>
                        <span className="font-medium text-slate-900">
                          {(() => {
                            const age = calculateAge(
                              selectedForDetail.birthDate
                            );
                            return age !== null ? `${age} tahun` : "—";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kolom kanan: Kontak & Alamat */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Kontak & Alamat
                    </h3>
                    <div className="rounded-xl border bg-white px-4 py-3 space-y-2">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Nomor WhatsApp</span>
                        <span className="font-mono text-slate-900 text-right">
                          {selectedForDetail.whatsapp}
                        </span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div>
                        <span className="text-slate-500 text-xs">
                          Alamat Lengkap
                        </span>
                        <p className="mt-1 text-slate-900 whitespace-pre-line">
                          {selectedForDetail.address || "—"}
                        </p>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div>
                        <span className="text-slate-500 text-xs">Catatan</span>
                        <p className="mt-1 text-slate-900 whitespace-pre-line">
                          {selectedForDetail.note || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDetailDialog}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
