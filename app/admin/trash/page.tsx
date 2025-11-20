// app/admin/trash/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Trash2,
  Loader2,
  RotateCcw,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type TrashType =
  | "TRIP"
  | "SCHEDULE"
  | "ANNOUNCEMENT"
  | "PARTICIPANT"
  | "USER"
  | "FEEDBACK"
  | "GALLERY"
  | "BADGE";

interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  deletedAt: string | null;
}

const TYPE_LABELS: Record<TrashType, string> = {
  TRIP: "Trip",
  SCHEDULE: "Jadwal",
  ANNOUNCEMENT: "Pengumuman",
  PARTICIPANT: "Peserta",
  USER: "User",
  FEEDBACK: "Feedback",
  GALLERY: "Galeri",
  BADGE: "Badge",
};

export default function AdminTrashPage() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<TrashItem | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trash");
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat data sampah");
      const raw: any[] = json.data ?? [];
      const mapped: TrashItem[] = raw.map((it) => ({
        type: it.type,
        id: it.id,
        label: it.label,
        deletedAt: it.deletedAt,
      }));
      setItems(mapped);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat data sampah",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchQ = q
        ? it.label.toLowerCase().includes(q.toLowerCase()) ||
          it.id.toLowerCase().includes(q.toLowerCase())
        : true;
      const matchType =
        typeFilter === "ALL" ? true : it.type === (typeFilter as TrashType);
      return matchQ && matchType;
    });
  }, [items, q, typeFilter]);

  function formatDeletedAt(dateStr: string | null) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  async function handleRestore(item: TrashItem) {
    setActingId(item.id);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memulihkan data");
      setItems((prev) =>
        prev.filter((x) => !(x.id === item.id && x.type === item.type))
      );
      toast({
        title: "Berhasil",
        description: `${TYPE_LABELS[item.type]} "${item.label}" dipulihkan`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memulihkan data",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  }

  function openHardDelete(item: TrashItem) {
    setTargetItem(item);
    setHardDeleteOpen(true);
  }

  function cancelHardDelete() {
    if (isActing) return;
    setHardDeleteOpen(false);
    setTargetItem(null);
  }

  async function confirmHardDelete() {
    if (!targetItem) return;
    setIsActing(true);
    setActingId(targetItem.id);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: targetItem.type, id: targetItem.id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal menghapus permanen");
      setItems((prev) =>
        prev.filter(
          (x) => !(x.id === targetItem.id && x.type === targetItem.type)
        )
      );
      toast({
        title: "Dihapus permanen",
        description: `${TYPE_LABELS[targetItem.type]} "${
          targetItem.label
        }" dihapus dari sistem`,
      });
      setHardDeleteOpen(false);
      setTargetItem(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus permanen",
        variant: "destructive",
      });
    } finally {
      setIsActing(false);
      setActingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-500" />
            Sampah Data
          </h1>
          <p className="text-slate-600 mt-1">
            Kelola data yang sudah dihapus. Kamu bisa memulihkan atau
            menghapus permanen
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadTrash}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Search className="text-slate-400" />
              <Input
                placeholder="Cari label atau ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400 w-4 h-4" />
              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter jenis data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua jenis</SelectItem>
                  <SelectItem value="TRIP">Trip</SelectItem>
                  <SelectItem value="SCHEDULE">Jadwal</SelectItem>
                  <SelectItem value="ANNOUNCEMENT">Pengumuman</SelectItem>
                  <SelectItem value="PARTICIPANT">Peserta</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="FEEDBACK">Feedback</SelectItem>
                  <SelectItem value="GALLERY">Galeri</SelectItem>
                  <SelectItem value="BADGE">Badge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel sampah */}
      <Card>
        <CardHeader>
          <CardTitle>Data di Sampah</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="py-2 px-3 text-left">Label</th>
                  <th className="py-2 px-3 text-left">Jenis</th>
                  <th className="py-2 px-3 text-left">Dihapus Pada</th>
                  <th className="py-2 px-3 text-left">ID</th>
                  <th className="py-2 px-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Memuat data sampah...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Belum ada data di sampah
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr
                      key={`${it.type}-${it.id}`}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="py-3 px-3">
                        <div className="font-medium">{it.label}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className="text-[11px] px-2 py-0.5"
                        >
                          {TYPE_LABELS[it.type]}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {formatDeletedAt(it.deletedAt)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs">
                        {it.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(it)}
                            disabled={actingId === it.id}
                            className="flex items-center gap-1"
                          >
                            {actingId === it.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Pulihkan
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHardDelete(it)}
                            disabled={actingId === it.id}
                            className="text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Hapus Permanen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Catatan: Hapus permanen tidak bisa dibatalkan. Untuk Trip, semua
            data terkait (jadwal, peserta, presensi, galeri, badge, dll) juga
            ikut terhapus.
          </p>
        </CardContent>
      </Card>

      {/* Dialog konfirmasi hapus permanen */}
      <Dialog open={hardDeleteOpen} onOpenChange={setHardDeleteOpen}>
        <DialogContent className="sm:max-w-[440px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-red-500" />
              Hapus Permanen Data
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Hapus{" "}
              <span className="font-semibold text-red-600">
                {targetItem
                  ? `${TYPE_LABELS[targetItem.type]} "${targetItem.label}"`
                  : "data ini"}
              </span>{" "}
              secara permanen?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Tindakan ini tidak bisa dibatalkan. Data yang sudah dihapus
              permanen tidak dapat dikembalikan.
            </p>
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={cancelHardDelete}
              disabled={isActing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmHardDelete}
              disabled={isActing}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white"
            >
              {isActing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
