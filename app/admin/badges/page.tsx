"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  CheckCircle,
  Camera,
  Ship,
  Mountain,
  MapPin,
} from "lucide-react";

// Modal & Confirm dialog dari shadcn
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConditionType =
  | "CHECKIN_SESSION"
  | "GALLERY_UPLOAD_SESSION"
  | "COMPLETE_ALL_SESSIONS";

interface AdminBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  location?: string | null;
  conditionType: ConditionType;
  targetValue?: number | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  isActive: boolean;
}

interface SessionOption {
  id: string;
  title: string;
}

interface TripOption {
  id: string;
  name: string;
  status: string;
}

const ICON_OPTIONS = [
  { value: "award", label: "Award / Trophy", icon: Award },
  { value: "ship", label: "Kapal / Cruise / Pelabuhan", icon: Ship },
  { value: "mountain", label: "Gunung / Trekking", icon: Mountain },
  { value: "camera", label: "Foto / Galeri", icon: Camera },
  { value: "map-pin", label: "Lokasi / Check-in", icon: MapPin },
  { value: "check", label: "Selesai / Master", icon: CheckCircle },
] as const;

function renderIcon(name: string, size = 18) {
  switch (name) {
    case "ship":
      return <Ship size={size} className="text-current" />;
    case "mountain":
      return <Mountain size={size} className="text-current" />;
    case "camera":
      return <Camera size={size} className="text-current" />;
    case "map-pin":
      return <MapPin size={size} className="text-current" />;
    case "check":
      return <CheckCircle size={size} className="text-current" />;
    case "award":
    default:
      return <Award size={size} className="text-current" />;
  }
}

export default function AdminBadgesPage() {
  const { toast } = useToast();

  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);

  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState<{
    code: string;
    name: string;
    description: string;
    icon: string;
    location: string;
    conditionType: ConditionType;
    targetValue: string;
    sessionId: string;
  }>({
    code: "",
    name: "",
    description: "",
    icon: "award",
    location: "",
    conditionType: "CHECKIN_SESSION",
    targetValue: "1",
    sessionId: "",
  });

  // === Fetch trips ===
  const fetchTrips = async () => {
    try {
      setIsLoadingTrips(true);
      const res = await fetch("/api/admin/trips", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message ?? "Gagal memuat trip");
      setTrips(data.items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Gagal memuat trip",
        description: e?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // === Fetch sessions per trip ===
  const fetchSessions = async (tripId: string) => {
    try {
      setIsLoadingSessions(true);
      const res = await fetch(`/api/trips/${tripId}/sessions`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message ?? "Gagal memuat sesi");
      setSessions(data.items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Gagal memuat sesi",
        description: e?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // === Fetch badges per trip ===
  const fetchBadges = async (tripId: string) => {
    try {
      setIsLoadingBadges(true);
      const res = await fetch(`/api/admin/badges?tripId=${tripId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message ?? "Gagal memuat badge");
      setBadges(data.items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Gagal memuat badge",
        description: e?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBadges(false);
    }
  };

  useEffect(() => {
    if (!selectedTripId) {
      setBadges([]);
      setSessions([]);
      resetForm();
      return;
    }
    fetchSessions(selectedTripId);
    fetchBadges(selectedTripId);
    resetForm();
  }, [selectedTripId]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      icon: "award",
      location: "",
      conditionType: "CHECKIN_SESSION",
      targetValue: "1",
      sessionId: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (badge: AdminBadge) => {
    setEditingId(badge.id);
    setForm({
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      location: badge.location ?? "",
      conditionType: badge.conditionType,
      targetValue: badge.targetValue ? String(badge.targetValue) : "1",
      sessionId: badge.sessionId ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) {
      toast({
        title: "Trip belum dipilih",
        description: "Pilih trip terlebih dahulu sebelum membuat badge.",
        variant: "destructive",
      });
      return;
    }

    // validasi simple
    if (
      (form.conditionType === "CHECKIN_SESSION" ||
        form.conditionType === "GALLERY_UPLOAD_SESSION") &&
      !form.sessionId
    ) {
      toast({
        title: "Sesi belum dipilih",
        description: "Pilih sesi terkait untuk badge ini.",
        variant: "destructive",
      });
      return;
    }

    if (
      form.conditionType === "GALLERY_UPLOAD_SESSION" &&
      (!form.targetValue || parseInt(form.targetValue, 10) < 1)
    ) {
      toast({
        title: "Jumlah foto tidak valid",
        description: "Isi minimal 1 foto untuk syarat badge.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        tripId: selectedTripId,
        code: form.code,
        name: form.name,
        description: form.description,
        icon: form.icon,
        location: form.location || null,
        conditionType: form.conditionType,
      };

      if (form.conditionType === "GALLERY_UPLOAD_SESSION") {
        payload.targetValue = parseInt(form.targetValue || "1", 10);
      }
      if (
        form.conditionType === "CHECKIN_SESSION" ||
        form.conditionType === "GALLERY_UPLOAD_SESSION"
      ) {
        payload.sessionId = form.sessionId || null;
      }

      if (!editingId) {
        const res = await fetch(`/api/admin/badges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message ?? "Gagal membuat badge");
        toast({
          title: "Badge dibuat",
          description: "Badge baru berhasil dibuat.",
        });
      } else {
        const { tripId, ...updatePayload } = payload;
        const res = await fetch(`/api/admin/badges/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message ?? "Gagal update badge");
        toast({
          title: "Badge diperbarui",
          description: "Perubahan telah disimpan.",
        });
      }

      resetForm();
      setIsModalOpen(false);
      await fetchBadges(selectedTripId);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Gagal menyimpan badge",
        description: e?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message ?? "Gagal menghapus badge");
      toast({ title: "Badge dihapus" });
      if (selectedTripId) await fetchBadges(selectedTripId);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Gagal menghapus badge",
        description: e?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Header + trip selector */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Badges</h1>
          <p className="text-muted-foreground mt-1">
            Atur misi / pencapaian untuk peserta, per trip.
          </p>
        </div>
        <div className="w-full md:w-72">
          <label className="text-xs font-medium mb-1 block">Pilih Trip</label>
          <Select
            value={selectedTripId}
            onValueChange={(v) => setSelectedTripId(v)}
            disabled={isLoadingTrips}
          >
            <SelectTrigger className="bg-white">
              <SelectValue
                placeholder={
                  isLoadingTrips
                    ? "Memuat trip..."
                    : "Pilih trip terlebih dahulu"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {trips.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedTripId && (
        <Card className="p-4 text-sm text-muted-foreground">
          Pilih trip terlebih dahulu untuk mengelola badge.
        </Card>
      )}

      {selectedTripId && (
        <>
          {/* List Badges + tombol Buat */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground">
                Daftar Badge Trip
              </h2>
              <Button size="sm" onClick={openCreateModal}>
                Buat Badge
              </Button>
            </div>

            {isLoadingBadges ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : badges.length === 0 ? (
              <div className="text-sm text-muted-foreground flex flex-col gap-2">
                <p>Belum ada badge untuk trip ini.</p>
                <p>Silakan buat badge terlebih dahulu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-md overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Kode</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Icon</th>
                      <th className="px-3 py-2 text-left">Tipe</th>
                      <th className="px-3 py-2 text-left">Sesi</th>
                      <th className="px-3 py-2 text-left">Target</th>
                      <th className="px-3 py-2 text-left">Lokasi</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {badges.map((b) => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {b.code}
                        </td>
                        <td className="px-3 py-2 font-medium">{b.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted">
                              {renderIcon(b.icon, 16)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {b.conditionType === "CHECKIN_SESSION" &&
                            "Check-in sesi"}
                          {b.conditionType === "GALLERY_UPLOAD_SESSION" &&
                            "Upload foto sesi"}
                          {b.conditionType === "COMPLETE_ALL_SESSIONS" &&
                            "Selesaikan semua agenda"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {b.sessionTitle ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {b.conditionType === "GALLERY_UPLOAD_SESSION"
                            ? b.targetValue ?? "-"
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {b.location || "-"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {b.isActive ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 text-[10px]">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-muted text-muted-foreground text-[10px]">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(b)}
                            >
                              Edit
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  Hapus
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Hapus badge ini?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Badge{" "}
                                    <span className="font-semibold">
                                      {b.name}
                                    </span>{" "}
                                    akan dihapus dan tidak bisa dikembalikan.
                                    Data pencapaian peserta terkait badge ini
                                    juga akan ikut dihapus.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(b.id)}
                                  >
                                    Ya, hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* MODAL CREATE / EDIT BADGE */}
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Badge" : "Buat Badge Baru"}
                </DialogTitle>
                <DialogDescription>
                  Atur nama, icon, dan syarat pencapaian untuk badge ini.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSave} className="space-y-3 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Kode
                    </label>
                    <Input
                      value={form.code}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, code: e.target.value }))
                      }
                      placeholder="Contoh: LABUAN_BAJO_EXPLORER"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Icon Badge
                    </label>
                    <Select
                      value={form.icon}
                      onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih icon">
                          {form.icon ? (
                            <div className="flex items-center gap-2">
                              {renderIcon(form.icon, 16)}
                              <span className="text-xs">
                                {ICON_OPTIONS.find((o) => o.value === form.icon)
                                  ?.label ?? form.icon}
                              </span>
                            </div>
                          ) : (
                            "Pilih icon"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon size={16} className="text-current" />
                              <span>{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                ({opt.value})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Nama Badge
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder=""
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Deskripsi
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Tipe Syarat
                    </label>
                    <Select
                      value={form.conditionType}
                      onValueChange={(v: ConditionType) =>
                        setForm((f) => ({
                          ...f,
                          conditionType: v,
                          // reset field yang nggak relevan
                          sessionId:
                            v === "COMPLETE_ALL_SESSIONS" ? "" : f.sessionId,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHECKIN_SESSION">
                          Check-in di sesi tertentu
                        </SelectItem>
                        <SelectItem value="GALLERY_UPLOAD_SESSION">
                          Upload X foto di sesi tertentu
                        </SelectItem>
                        <SelectItem value="COMPLETE_ALL_SESSIONS">
                          Selesaikan semua agenda
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(form.conditionType === "CHECKIN_SESSION" ||
                    form.conditionType === "GALLERY_UPLOAD_SESSION") && (
                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Sesi Terkait
                      </label>
                      <Select
                        value={form.sessionId}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, sessionId: v }))
                        }
                        disabled={isLoadingSessions}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sesi" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.conditionType === "GALLERY_UPLOAD_SESSION" && (
                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Jumlah foto
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={form.targetValue}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            targetValue: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Lokasi (opsional)
                  </label>
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? "Menyimpan..."
                      : editingId
                      ? "Simpan Perubahan"
                      : "Buat Badge"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
