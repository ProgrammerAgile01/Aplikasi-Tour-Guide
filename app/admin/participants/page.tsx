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
  lastCheckIn?: string | null;
  totalCheckIns: number;
  tripId: string;
  createdAt?: string;
}

interface Trip {
  id: string;
  name: string;
  status: string;
}

export default function AdminParticipantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    address: "",
  });

  const [trips, setTrips] = useState<Trip[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

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
    email: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);
  useEffect(() => {
    if (selectedTripId) loadParticipants(selectedTripId);
    else setParticipants([]);
  }, [selectedTripId]);

  async function loadTrips() {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat trips");
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

  async function loadParticipants(tripId: string) {
    setLoadingParticipants(true);
    try {
      const res = await fetch(
        `/api/participants?tripId=${encodeURIComponent(tripId)}`
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
    payload: { name: string; whatsapp: string; address: string }
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

  const filteredParticipants = participants.filter((p) => {
    const matchesTrip = !selectedTripId || p.tripId === selectedTripId;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.whatsapp.includes(searchQuery) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTrip && matchesSearch;
  });

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
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", whatsapp: "", address: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: "", whatsapp: "", address: "" });
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
            email: json.user?.email ?? json.participant?.loginEmail ?? "",
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

  const stats = {
    total: filteredParticipants.length,
    present: filteredParticipants.filter((p) => p.lastCheckIn).length,
    absent: filteredParticipants.filter((p) => !p.lastCheckIn).length,
  };

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
              <div className="flex justify-between">
                <CardTitle className="text-xl">Daftar Peserta</CardTitle>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus size={16} /> Tambah Peserta
                </Button>
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
                        Alamat
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Status Kehadiran Terakhir
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Total Check-in
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
                      filteredParticipants.map((participant) => (
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
                          <td className="py-3 px-4 text-slate-700">
                            {participant.totalCheckIns}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
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
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Peserta" : "Tambah Peserta Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Perbarui informasi peserta di bawah ini."
                : "Masukkan informasi peserta baru di bawah ini."}
            </DialogDescription>
          </DialogHeader>
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
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Nomor WhatsApp *</Label>
              <Input
                id="whatsapp"
                placeholder="Contoh: +62 812-3456-7890"
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, whatsapp: e.target.value })
                }
              />
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
          </div>
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
              Tindakan ini tidak dapat dibatalkan.
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
              <p className="text-xs text-slate-500">Email</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm">
                  {lastCreatedCredential?.email}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      lastCreatedCredential?.email ?? ""
                    );
                    toast({ title: "Copied", description: "Email disalin" });
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
              Sebaiknya minta peserta mengganti password setelah login.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
