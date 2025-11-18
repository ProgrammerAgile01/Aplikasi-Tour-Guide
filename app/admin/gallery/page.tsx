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
  Map,
  Users,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Camera,
  CheckCircle2,
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

interface Trip {
  id: string;
  name: string;
  status: string;
}

interface Participant {
  id: string;
  name: string;
  whatsapp: string;
}

interface Session {
  id: string;
  title: string;
  location?: string | null;
  day?: number;
  timeText?: string;
}

type GalleryStatus = "PENDING" | "APPROVED";

interface GalleryItem {
  id: string;
  tripId: string;
  participantId: string;
  participantName: string;
  participantWhatsapp: string;
  sessionId: string;
  sessionTitle: string;
  sessionLocation?: string | null;
  note?: string | null;
  imageUrl: string;
  status: GalleryStatus;
  createdAt?: string | Date;
}

function formatDateTime(value?: string | Date) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderStatusBadge(status: GalleryStatus) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Disetujui
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
      Menunggu
    </span>
  );
}

export default function AdminGalleryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    participantId: string;
    sessionId: string;
    note: string;
    imageUrl: string;
  }>({
    participantId: "",
    sessionId: "",
    note: "",
    imageUrl: "",
  });

  // mode gambar: url / file
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    participantName?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [previewItem, setPreviewItem] = useState<{
    imageUrl: string;
    sessionTitle?: string;
    participantName?: string;
  } | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      loadGallery(selectedTripId);
      loadParticipants(selectedTripId);
      loadSessions(selectedTripId);
    } else {
      setItems([]);
      setParticipants([]);
      setSessions([]);
    }
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

  async function loadGallery(tripId: string) {
    setLoadingGallery(true);
    try {
      const res = await fetch(
        `/api/galleries?tripId=${encodeURIComponent(tripId)}`
      );
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat galeri");
      setItems(json.items ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat galeri",
        variant: "destructive",
      });
    } finally {
      setLoadingGallery(false);
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

  async function loadSessions(tripId: string) {
    setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/schedules?tripId=${encodeURIComponent(tripId)}`
      );
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat jadwal");
      setSessions(json.items ?? json.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat jadwal",
        variant: "destructive",
      });
    } finally {
      setLoadingSessions(false);
    }
  }

  async function createGalleryApi(payload: {
    participantId: string;
    sessionId: string;
    note?: string;
    imageUrl: string;
  }) {
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function updateGalleryApi(
    id: string,
    payload: { note?: string; imageUrl?: string; status?: GalleryStatus }
  ) {
    const res = await fetch(`/api/galleries/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function deleteGalleryApi(id: string) {
    const res = await fetch(`/api/galleries/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.json();
  }

  async function uploadImageFile(file: File): Promise<string> {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const res = await fetch("/api/galleries/upload", {
      method: "POST",
      body: formDataUpload,
    });
    const json = await res.json();

    if (!res.ok || !json?.ok || !json?.url) {
      throw new Error(json?.message || "Gagal mengupload gambar");
    }
    return json.url as string;
  }

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.participantName.toLowerCase().includes(q) ||
      item.participantWhatsapp.toLowerCase().includes(q) ||
      (item.sessionTitle || "").toLowerCase().includes(q) ||
      (item.sessionLocation || "").toLowerCase().includes(q) ||
      (item.note || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: filteredItems.length,
    uniqueParticipants: new Set(filteredItems.map((i) => i.participantId)).size,
    today: filteredItems.filter((i) => {
      if (!i.createdAt) return false;
      const d = new Date(i.createdAt);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length,
  };

  function handleOpenDialog(item?: GalleryItem) {
    if (!selectedTripId && !item) {
      toast({
        title: "Pilih Trip Terlebih Dahulu",
        description: "Silakan pilih trip untuk menambah galeri.",
        variant: "destructive",
      });
      return;
    }

    if (item) {
      setEditingId(item.id);
      setFormData({
        participantId: item.participantId,
        sessionId: item.sessionId,
        note: item.note ?? "",
        imageUrl: item.imageUrl ?? "",
      });
      setImageMode("url");
      setImageFile(null);
    } else {
      setEditingId(null);
      setFormData({
        participantId: "",
        sessionId: "",
        note: "",
        imageUrl: "",
      });
      setImageMode("url");
      setImageFile(null);
    }

    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      participantId: "",
      sessionId: "",
      note: "",
      imageUrl: "",
    });
    setImageMode("url");
    setImageFile(null);
    setIsSaving(false);
  }

  async function handleSubmit() {
    if (!formData.participantId || !formData.sessionId) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Peserta dan sesi wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      let finalImageUrl = (formData.imageUrl ?? "").trim();

      if (imageMode === "file") {
        if (!imageFile) {
          toast({
            title: "Gambar Belum Dipilih",
            description: "Silakan pilih file gambar terlebih dahulu.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        finalImageUrl = await uploadImageFile(imageFile);
      }

      if (!finalImageUrl) {
        toast({
          title: "Gambar Kosong",
          description: "URL atau file gambar wajib diisi.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (editingId) {
        const json = await updateGalleryApi(editingId, {
          note: formData.note || undefined,
          imageUrl: finalImageUrl,
        });
        if (!json.ok) throw new Error(json.message || "Gagal update galeri");

        setItems((prev) =>
          prev.map((x) => (x.id === editingId ? json.item : x))
        );
        toast({
          title: "Galeri Diperbarui",
          description: "Data galeri berhasil diperbarui.",
        });
      } else {
        const json = await createGalleryApi({
          participantId: formData.participantId,
          sessionId: formData.sessionId,
          note: formData.note || undefined,
          imageUrl: finalImageUrl,
        });
        if (!json.ok) throw new Error(json.message || "Gagal menambah galeri");

        setItems((prev) => [json.item, ...prev]);
        toast({
          title: "Galeri Ditambahkan",
          description: "Foto galeri baru berhasil ditambahkan.",
        });
      }
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menyimpan galeri",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  }

  function openDeleteModal(item: { id: string; participantName?: string }) {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const json = await deleteGalleryApi(deletingItem.id);
      if (!json.ok) throw new Error(json.message || "Gagal menghapus galeri");

      setItems((prev) => prev.filter((x) => x.id !== deletingItem.id));
      toast({
        title: "Galeri Dihapus",
        description: `Galeri peserta "${
          deletingItem.participantName ?? ""
        }" berhasil dihapus.`,
      });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus galeri",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function cancelDelete() {
    setDeleteDialogOpen(false);
    setDeletingItem(null);
  }

  async function handleApprove(id: string) {
    try {
      const json = await updateGalleryApi(id, { status: "APPROVED" });
      if (!json.ok) throw new Error(json.message || "Gagal menyetujui galeri");

      setItems((prev) => prev.map((x) => (x.id === id ? json.item : x)));
      toast({
        title: "Galeri Disetujui",
        description: "Status galeri diubah menjadi disetujui.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menyetujui galeri",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Galeri</h1>
          <p className="text-slate-600 mt-1">
            Kelola dokumentasi foto perjalanan peserta.
          </p>
        </div>
      </div>

      {/* Trip selector */}
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
                        : "Pilih trip untuk melihat galeri..."
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
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.total}
                    </p>
                    <p className="text-sm text-slate-600">Total Foto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.uniqueParticipants}
                    </p>
                    <p className="text-sm text-slate-600">
                      Peserta Berkontribusi
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.today}
                    </p>
                    <p className="text-sm text-slate-600">Upload Hari Ini</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <Input
                  placeholder="Cari berdasarkan nama peserta, WA, sesi, lokasi, atau catatan..."
                  value={searchQuery ?? ""}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table / Cards */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Daftar Galeri</CardTitle>
                {/* <Button
                  onClick={() => handleOpenDialog()}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={loadingParticipants || loadingSessions}
                >
                  <Plus size={16} /> Tambah Foto
                </Button> */}
              </div>
            </CardHeader>
            <CardContent>
              {/* MOBILE: card list */}
              <div className="space-y-3 md:hidden">
                {loadingGallery ? (
                  <p className="py-4 text-center text-slate-500">
                    Memuat galeri…
                  </p>
                ) : filteredItems.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    Belum ada foto galeri untuk trip ini.
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-xl p-3 shadow-sm bg-white"
                    >
                      <div className="flex gap-3">
                        {/* thumbnail */}
                        <div className="w-24 h-20 flex-shrink-0">
                          {item.imageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewItem({
                                  imageUrl: item.imageUrl,
                                  sessionTitle: item.sessionTitle,
                                  participantName: item.participantName,
                                })
                              }
                              className="block w-full h-full focus:outline-none cursor-pointer"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.sessionTitle}
                                className="w-full h-full object-cover rounded-lg border border-slate-200"
                              />
                            </button>
                          ) : (
                            <div className="w-full h-full border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* content */}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.participantName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.participantWhatsapp}
                              </p>
                            </div>
                            {renderStatusBadge(item.status)}
                          </div>

                          <div className="text-xs text-slate-600 mt-1">
                            <p className="font-medium text-slate-900">
                              {item.sessionTitle}
                            </p>
                            {item.sessionLocation && (
                              <p className="text-slate-500">
                                {item.sessionLocation}
                              </p>
                            )}
                          </div>

                          {item.note && (
                            <p className="text-xs text-slate-600 mt-1">
                              {item.note}
                            </p>
                          )}

                          <p className="text-[11px] text-slate-400 mt-1">
                            {formatDateTime(item.createdAt)}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.status === "PENDING" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(item.id)}
                                className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Setujui
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(item)}
                              className="h-8 px-2 text-xs gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDeleteModal({
                                  id: item.id,
                                  participantName: item.participantName,
                                })
                              }
                              className="h-8 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Peserta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Sesi
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Lokasi
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Catatan
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Gambar
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Waktu Upload
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGallery ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-slate-500"
                        >
                          Memuat galeri…
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-slate-500"
                        >
                          Belum ada foto galeri untuk trip ini.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 px-4 align-top">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {item.participantName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {item.participantWhatsapp}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900 align-top">
                            {item.sessionTitle}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 align-top">
                            {item.sessionLocation || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 align-top max-w-xs">
                            {item.note || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            {item.imageUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewItem({
                                    imageUrl: item.imageUrl,
                                    sessionTitle: item.sessionTitle,
                                    participantName: item.participantName,
                                  })
                                }
                                className="inline-block focus:outline-none cursor-pointer"
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.sessionTitle}
                                  className="h-16 w-24 rounded object-cover border border-slate-200"
                                />
                              </button>
                            ) : (
                              <div className="h-16 w-24 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-xs">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            {renderStatusBadge(item.status)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 align-top whitespace-nowrap">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="flex gap-2">
                              {item.status === "PENDING" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(item.id)}
                                  className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 size={14} /> Setujui
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(item)}
                                className="gap-1"
                              >
                                <Pencil size={14} /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openDeleteModal({
                                    id: item.id,
                                    participantName: item.participantName,
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
            <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500">
              Silakan pilih trip di atas untuk melihat dan mengelola galeri.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog create/edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Foto Galeri" : "Tambah Foto Galeri"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Perbarui informasi galeri di bawah ini."
                : "Masukkan informasi foto galeri baru di bawah ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Peserta *</Label>
              <Select
                value={formData.participantId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, participantId: v }))
                }
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingParticipants
                        ? "Memuat peserta..."
                        : "Pilih peserta"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.whatsapp})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sesi / Agenda *</Label>
              <Select
                value={formData.sessionId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, sessionId: v }))
                }
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingSessions ? "Memuat jadwal..." : "Pilih sesi"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                      {s.location ? ` — ${s.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sumber gambar: URL / Upload */}
            <div className="space-y-2">
              <Label>Sumber Gambar *</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={imageMode === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImageMode("url")}
                >
                  Pakai URL
                </Button>
                <Button
                  type="button"
                  variant={imageMode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImageMode("file")}
                >
                  Upload File
                </Button>
              </div>

              {imageMode === "url" ? (
                <>
                  <Input
                    key="image-url-input"
                    placeholder="https://contoh.com/foto.jpg atau /uploads/foto.jpg"
                    value={formData.imageUrl ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Masukkan URL penuh atau path gambar yang sudah tersedia.
                  </p>
                </>
              ) : (
                <>
                  <Input
                    key="image-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImageFile(file);
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    File akan diupload ke server dan disimpan sebagai URL
                    otomatis.
                  </p>
                  {imageFile && (
                    <p className="text-xs text-slate-600 mt-1">
                      File terpilih:{" "}
                      <span className="font-medium">{imageFile.name}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Catatan / Deskripsi</Label>
              <Textarea
                rows={3}
                placeholder="Misal: Sesi foto di dermaga sebelum berangkat sailing."
                value={formData.note ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
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
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : editingId ? (
                "Perbarui"
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5 text-red-500" /> Konfirmasi Hapus
              Galeri
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Apakah Anda yakin ingin menghapus foto galeri peserta{" "}
              <span className="font-semibold text-red-600">
                {deletingItem?.participantName ?? "ini"}
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
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Image dialog */}
      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewItem?.sessionTitle || "Preview Foto Galeri"}
            </DialogTitle>
            <DialogDescription>
              {previewItem?.participantName
                ? `Foto dari ${previewItem.participantName}. Klik di luar dialog untuk menutup.`
                : "Klik di luar dialog untuk menutup."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {previewItem && (
              <img
                src={previewItem.imageUrl}
                alt={previewItem.sessionTitle || "Preview foto"}
                className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-200 bg-slate-50"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
