"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// (opsional) pakai dialog shadcn untuk konfirmasi hapus
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type TripStatus = "ongoing" | "completed";

interface Trip {
  id: string;
  name: string;
  status: TripStatus;
  description: string;
  startDate: string; // yyyy-mm-dd atau ISO
  endDate: string; // yyyy-mm-dd atau ISO
  location: string;
  createdAt: string; // ISO
}

/* ============================ API HELPERS ============================ */

function slugifyId(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function apiGetTrips(params?: {
  status?: TripStatus;
  q?: string;
  take?: number;
  skip?: number;
}): Promise<Trip[]> {
  const url = new URL("/api/trips", window.location.origin);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.q) url.searchParams.set("q", params.q);
  if (typeof params?.take === "number")
    url.searchParams.set("take", String(params.take));
  if (typeof params?.skip === "number")
    url.searchParams.set("skip", String(params.skip));

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memuat data trip.");
  return (json.items || []) as Trip[];
}

async function apiCreateTrip(payload: {
  id: string;
  name: string;
  status: TripStatus;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
}) {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal membuat trip.");
  return json.item as Trip;
}

async function apiUpdateTrip(
  id: string,
  payload: Partial<Omit<Trip, "id" | "createdAt">>
) {
  if (!id) throw new Error("ID trip tidak valid.");
  const body = JSON.stringify({ id, ...payload }); // sertakan id di body (fallback)
  const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memperbarui trip.");
  return json.item as Trip;
}

async function apiDeleteTrip(id: string) {
  if (!id) throw new Error("ID trip tidak valid.");
  // sertakan id di path & query agar backend pasti menerima
  const url = `/api/trips/${encodeURIComponent(id)}?id=${encodeURIComponent(
    id
  )}`;
  const res = await fetch(url, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal menghapus trip.");
}

/* ============================ PAGE ============================ */

export default function TripsPage() {
  const { toast } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Dialog konfirmasi hapus
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    status: "ongoing" as TripStatus,
    description: "",
    startDate: "",
    endDate: "",
    location: "",
  });

  // initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiGetTrips()
      .then((items) => mounted && setTrips(items))
      .catch((err: any) =>
        toast({
          title: "Gagal Memuat",
          description: err?.message || "Terjadi kesalahan saat memuat trip.",
          variant: "destructive",
        })
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [toast]);

  const totalOngoing = useMemo(
    () => trips.filter((t) => t.status === "ongoing").length,
    [trips]
  );
  const totalCompleted = useMemo(
    () => trips.filter((t) => t.status === "completed").length,
    [trips]
  );

  const resetForm = () => {
    setFormData({
      name: "",
      status: "ongoing",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
    });
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingTrip(null);
    resetForm();
  };

  const handleEdit = (trip: Trip) => {
    if (!trip?.id) {
      toast({
        title: "Tidak Bisa Edit",
        description: "Trip tidak memiliki ID.",
        variant: "destructive",
      });
      return;
    }
    setEditingTrip(trip);
    setFormData({
      name: trip.name,
      status: trip.status,
      description: trip.description,
      startDate: trip.startDate.slice(0, 10),
      endDate: trip.endDate.slice(0, 10),
      location: trip.location,
    });
    setIsDialogOpen(true);
  };

  // buka dialog konfirmasi hapus
  const askDelete = (tripId: string) => {
    if (!tripId) {
      toast({
        title: "Gagal Menghapus",
        description: "ID trip tidak valid.",
        variant: "destructive",
      });
      return;
    }
    setPendingDeleteId(tripId);
    setConfirmOpen(true);
  };

  // eksekusi hapus setelah konfirmasi
  const confirmDelete = async () => {
    const tripId = pendingDeleteId;
    if (!tripId) return;
    setConfirmOpen(false);

    const prev = trips;
    setTrips((cur) => cur.filter((t) => t.id !== tripId));
    try {
      await apiDeleteTrip(tripId);
      toast({
        title: "Trip Dihapus",
        description: "Trip berhasil dihapus dari sistem.",
      });
    } catch (err: any) {
      setTrips(prev);
      toast({
        title: "Gagal Menghapus",
        description: err?.message || "Terjadi kesalahan saat menghapus trip.",
        variant: "destructive",
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal mulai/selesai wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        variant: "destructive",
      });
      return;
    }

    if (editingTrip) {
      if (!editingTrip.id) {
        toast({
          title: "Gagal Memperbarui",
          description: "ID trip tidak ditemukan.",
          variant: "destructive",
        });
        return;
      }

      const prev = trips;
      const nextLocal = prev.map((t) =>
        t.id === editingTrip.id ? { ...t, ...formData } : t
      );
      setTrips(nextLocal);

      try {
        const updated = await apiUpdateTrip(editingTrip.id, { ...formData });
        setTrips((cur) => cur.map((t) => (t.id === updated.id ? updated : t)));
        toast({
          title: "Trip Diperbarui",
          description: "Data trip berhasil diperbarui.",
        });
      } catch (err: any) {
        setTrips(prev);
        toast({
          title: "Gagal Memperbarui",
          description:
            err?.message || "Terjadi kesalahan saat memperbarui trip.",
          variant: "destructive",
        });
      }
    } else {
      const id = slugifyId(formData.name);
      if (!id) {
        toast({
          title: "Validasi Gagal",
          description: "Nama trip tidak valid.",
          variant: "destructive",
        });
        return;
      }

      const temp: Trip = {
        id,
        name: formData.name,
        status: formData.status,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        createdAt: new Date().toISOString(),
      };
      setTrips((cur) => [temp, ...cur]);

      try {
        const created = await apiCreateTrip({
          id,
          name: formData.name,
          status: formData.status,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          location: formData.location,
        });
        setTrips((cur) => [created, ...cur.filter((t) => t.id !== created.id)]);
        toast({
          title: "Trip Ditambahkan",
          description: "Trip baru berhasil ditambahkan.",
        });
      } catch (err: any) {
        setTrips((cur) => cur.filter((t) => t.id !== id));
        toast({
          title: "Gagal Menambahkan",
          description:
            err?.message || "Terjadi kesalahan saat menambahkan trip.",
          variant: "destructive",
        });
      }
    }

    setIsDialogOpen(false);
    setEditingTrip(null);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manajemen Trip</h1>
          <p className="text-slate-600 mt-1">
            Kelola trip perjalanan dan event perusahaan
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus size={18} />
          Buat Trip Baru
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "…" : trips.length}
            </div>
            <p className="text-sm text-slate-600 mt-1">Total Trip</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {loading ? "…" : totalOngoing}
            </div>
            <p className="text-sm text-slate-600 mt-1">Trip Berjalan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-600">
              {loading ? "…" : totalCompleted}
            </div>
            <p className="text-sm text-slate-600 mt-1">Trip Selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Trip List */}
      <div className="space-y-4">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <Card key={`skeleton-${i}`} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
                  <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((__, j) => (
                      <div key={j}>
                        <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-36 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-slate-600">
              Belum ada trip. Mulai dengan membuat trip baru.
            </CardContent>
          </Card>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {trip.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trip.status === "ongoing"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {trip.status === "ongoing"
                          ? "Sedang Berjalan"
                          : "Selesai"}
                      </span>
                    </div>

                    <p className="text-slate-600 mb-4 leading-relaxed">
                      {trip.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Tanggal Mulai</p>
                        <p className="font-medium text-slate-900">
                          {new Date(trip.startDate).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Tanggal Selesai</p>
                        <p className="font-medium text-slate-900">
                          {new Date(trip.endDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Lokasi</p>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-blue-600" />
                          <p className="font-medium text-slate-900">
                            {trip.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(trip)}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => askDelete(trip.id)} // buka dialog konfirmasi
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Form */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingTrip ? "Edit Trip" : "Buat Trip Baru"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Nama Trip <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Trip Komodo Executive 2025"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TripStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ongoing">Sedang Berjalan</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Deskripsi <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Deskripsi lengkap tentang trip ini..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Tanggal Selesai <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Contoh: Labuan Bajo, NTT"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingTrip ? "Simpan Perubahan" : "Buat Trip"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 bg-transparent"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Trip?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak bisa dibatalkan. Trip akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
