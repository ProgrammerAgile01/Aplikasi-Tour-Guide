"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Pin, AlertCircle, Info } from "lucide-react";

/* ============================ TYPES ============================ */

type TripStatus = "ongoing" | "completed";
type Priority = "normal" | "important";

interface Trip {
  id: string;
  name: string;
  status: TripStatus;
}

interface Announcement {
  id: string;
  tripId: string;
  title: string;
  content: string;
  priority: Priority;
  isPinned: boolean;
  createdAt: string; // ISO
}

/* ============================ API HELPERS ============================ */

async function apiGetTrips(): Promise<Trip[]> {
  const url = new URL("/api/trips", window.location.origin);
  url.searchParams.set("take", "200");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memuat trip.");
  return (json.items || []).map((t: any) => ({
    id: String(t.id),
    name: String(t.name),
    status: t.status as TripStatus,
  })) as Trip[];
}

async function apiGetAnnouncements(tripId: string): Promise<Announcement[]> {
  const url = new URL("/api/announcements", window.location.origin);
  url.searchParams.set("tripId", tripId);
  url.searchParams.set("take", "500");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memuat pengumuman.");
  return (json.items || []).map((a: any) => ({
    id: String(a.id),
    tripId: String(a.tripId),
    title: String(a.title),
    content: String(a.content),
    priority: a.priority as Priority,
    isPinned: Boolean(a.isPinned),
    createdAt: String(a.createdAt),
  })) as Announcement[];
}

async function apiCreateAnnouncement(payload: {
  tripId: string;
  title: string;
  content: string;
  priority: Priority;
  isPinned: boolean;
}): Promise<Announcement> {
  const res = await fetch("/api/announcements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal membuat pengumuman.");
  return json.item as Announcement;
}

async function apiUpdateAnnouncement(
  id: string,
  payload: Partial<
    Pick<Announcement, "title" | "content" | "priority" | "isPinned">
  >
): Promise<Announcement> {
  if (!id) throw new Error("ID wajib diisi pada URL.");
  const res = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memperbarui pengumuman.");
  return json.item as Announcement;
}

async function apiDeleteAnnouncement(id: string) {
  if (!id) throw new Error("ID wajib diisi.");
  const res = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal menghapus pengumuman.");
}

/* ============================ PAGE ============================ */

export default function AdminAnnouncementsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editOpenId, setEditOpenId] = useState<string | null>(null); // controlled edit dialog
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal" as Priority,
    isPinned: false,
  });

  // Load trips
  useEffect(() => {
    let mounted = true;
    setLoadingTrips(true);
    apiGetTrips()
      .then((ts) => {
        if (!mounted) return;
        setTrips(ts);
        if (!selectedTripId && ts.length > 0) {
          const ongoing = ts.find((t) => t.status === "ongoing");
          setSelectedTripId(ongoing?.id || ts[0].id);
        }
      })
      .catch((e: any) =>
        toast({
          title: "Gagal Memuat",
          description: e?.message,
          variant: "destructive",
        })
      )
      .finally(() => mounted && setLoadingTrips(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Load announcements when trip changes
  useEffect(() => {
    if (!selectedTripId) {
      setAnnouncements([]);
      return;
    }
    let mounted = true;
    setLoadingAnnouncements(true);
    apiGetAnnouncements(selectedTripId)
      .then((as) => mounted && setAnnouncements(as))
      .catch((e: any) =>
        toast({
          title: "Gagal Memuat",
          description: e?.message,
          variant: "destructive",
        })
      )
      .finally(() => mounted && setLoadingAnnouncements(false));
    return () => {
      mounted = false;
    };
  }, [selectedTripId]);

  const resetForm = () =>
    setFormData({
      title: "",
      content: "",
      priority: "normal",
      isPinned: false,
    });

  // Create
  const handleAddAnnouncement = async () => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip",
        description: "Silakan pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    try {
      const created = await apiCreateAnnouncement({
        tripId: selectedTripId,
        ...formData,
      });
      setAnnouncements((cur) => [created, ...cur]);
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Pengumuman Ditambahkan",
        description: "Pengumuman berhasil dipublikasikan.",
      });
    } catch (e: any) {
      toast({
        title: "Gagal Menambah",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const startEdit = (a: Announcement) => {
    setEditOpenId(a.id);
    setFormData({
      title: a.title,
      content: a.content,
      priority: a.priority,
      isPinned: a.isPinned,
    });
  };

  // Update
  const handleUpdateAnnouncement = async () => {
    if (!editOpenId) {
      toast({
        title: "Gagal Memperbarui",
        description: "ID wajib diisi pada URL.",
        variant: "destructive",
      });
      return;
    }
    try {
      const updated = await apiUpdateAnnouncement(editOpenId, { ...formData });
      setAnnouncements((cur) =>
        cur.map((x) => (x.id === updated.id ? updated : x))
      );
      setEditOpenId(null); // close dialog
      resetForm();
      toast({
        title: "Pengumuman Diperbarui",
        description: "Perubahan berhasil disimpan.",
      });
    } catch (e: any) {
      toast({
        title: "Gagal Memperbarui",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Toggle pin
  const handleTogglePin = async (a: Announcement) => {
    try {
      const updated = await apiUpdateAnnouncement(a.id, {
        isPinned: !a.isPinned,
      });
      setAnnouncements((cur) =>
        cur.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Delete
  const handleDeleteAnnouncement = async (id: string) => {
    const prev = announcements;
    setAnnouncements((cur) => cur.filter((x) => x.id !== id)); // optimistik
    try {
      await apiDeleteAnnouncement(id);
      toast({
        title: "Pengumuman Dihapus",
        description: "Pengumuman berhasil dihapus.",
      });
    } catch (e: any) {
      setAnnouncements(prev); // rollback
      toast({
        title: "Gagal Menghapus",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Sort: pinned dulu
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [announcements]);

  return (
    <div className="p-6 space-y-6">
      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pengumuman</h1>
          <p className="text-slate-600 mt-1">Kelola pengumuman untuk peserta</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!selectedTripId}>
              <Plus size={16} />
              Buat Pengumuman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Pengumuman Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Contoh: Perubahan Jadwal Hari Ke-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Isi Pengumuman</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Tulis detail pengumuman di sini..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) =>
                    setFormData({ ...formData, priority: v as Priority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Penting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPinned"
                  checked={formData.isPinned}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, isPinned: !!c })
                  }
                />
                <Label htmlFor="isPinned" className="font-normal">
                  Pin di urutan teratas
                </Label>
              </div>
              <Button onClick={handleAddAnnouncement} className="w-full">
                Publikasikan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pilih Trip */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Pilih Trip</Label>
            <select
              className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              disabled={loadingTrips}
            >
              <option value="">
                {loadingTrips ? "Memuat..." : "-- Pilih Trip --"}
              </option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (
                  {t.status === "ongoing" ? "Sedang Berjalan" : "Selesai"})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">
                {announcements.length}
              </p>
              <p className="text-sm text-slate-600 mt-1">Total Pengumuman</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {announcements.filter((a) => a.priority === "important").length}
              </p>
              <p className="text-sm text-slate-600 mt-1">Penting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {announcements.filter((a) => a.isPinned).length}
              </p>
              <p className="text-sm text-slate-600 mt-1">Dipasang Pin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loadingAnnouncements ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Memuat pengumuman…
            </CardContent>
          </Card>
        ) : (
          sortedAnnouncements.map((a) => (
            <Card
              key={a.id}
              className={`${
                a.priority === "important" ? "border-red-300 border-2" : ""
              } ${a.isPinned ? "bg-blue-50/50" : ""}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.isPinned && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          <Pin size={12} />
                          Dipasang
                        </span>
                      )}
                      {a.priority === "important" ? (
                        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                          <AlertCircle size={12} />
                          Penting
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
                          <Info size={12} />
                          Normal
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {a.title}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {a.content}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePin(a)}
                      className={a.isPinned ? "text-blue-600" : ""}
                    >
                      <Pin size={16} />
                    </Button>

                    {/* EDIT (controlled) */}
                    <Dialog
                      open={editOpenId === a.id}
                      onOpenChange={(o) => !o && setEditOpenId(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => startEdit(a)}
                        >
                          <Edit2 size={16} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Pengumuman</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Judul</Label>
                            <Input
                              value={formData.title}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  title: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Isi Pengumuman</Label>
                            <Textarea
                              value={formData.content}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  content: e.target.value,
                                })
                              }
                              rows={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prioritas</Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(v) =>
                                setFormData({
                                  ...formData,
                                  priority: v as Priority,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="important">
                                  Penting
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="edit-isPinned"
                              checked={formData.isPinned}
                              onCheckedChange={(c) =>
                                setFormData({ ...formData, isPinned: !!c })
                              }
                            />
                            <Label
                              htmlFor="edit-isPinned"
                              className="font-normal"
                            >
                              Pin di urutan teratas
                            </Label>
                          </div>
                          <Button
                            onClick={handleUpdateAnnouncement}
                            className="w-full"
                          >
                            Simpan Perubahan
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* DELETE (confirm dialog) */}
                    <Dialog
                      open={confirmDeleteId === a.id}
                      onOpenChange={(o) => !o && setConfirmDeleteId(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setConfirmDeleteId(a.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Hapus Pengumuman?</DialogTitle>
                        </DialogHeader>
                        <p className="text-slate-600">
                          Tindakan ini tidak bisa dibatalkan. Yakin ingin
                          menghapus pengumuman ini?
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            className="bg-transparent flex-1"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Batal
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={async () => {
                              const id = confirmDeleteId;
                              setConfirmDeleteId(null);
                              if (!id) return;
                              await handleDeleteAnnouncement(id);
                            }}
                          >
                            Hapus
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
