"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface UserRow {
  id: string;
  username: string;
  name: string;
  whatsapp: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  userTrips?: any[];
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat users");
      setUsers(json.items ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat pengguna",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(u.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal update");
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, isActive: json.item.isActive } : x
        )
      );
      toast({
        title: "Berhasil",
        description: `Pengguna ${json.item.name} ${
          json.item.isActive ? "diaktifkan" : "dinonaktifkan"
        }`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal update pengguna",
        variant: "destructive",
      });
    }
  }

  const openDelete = (u: UserRow) => {
    setDeleting(u);
    setDeleteOpen(true);
  };
  const cancelDelete = () => {
    setDeleteOpen(false);
    setDeleting(null);
  };

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Gagal hapus");
      setUsers((prev) => prev.filter((x) => x.id !== deleting.id));
      toast({ title: "Berhasil", description: "Pengguna dihapus" });
      setDeleteOpen(false);
      setDeleting(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus pengguna",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pengguna</h1>
          <p className="text-slate-600 mt-1">Kelola akun pengguna aplikasi</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex gap-3 items-center">
            <Search className="text-slate-400" />
            <Input
              placeholder="Cari nama, username atau whatsapp..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button onClick={loadUsers}>Cari</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left">Nama</th>
                  <th className="py-2 px-3 text-left">Username</th>
                  <th className="py-2 px-3 text-left">WhatsApp</th>
                  <th className="py-2 px-3 text-left">Role</th>
                  <th className="py-2 px-3 text-left">Aktif</th>
                  <th className="py-2 px-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Belum ada pengguna
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-3">{u.name}</td>
                      <td className="py-3 px-3 text-slate-600">{u.username}</td>
                      <td className="py-3 px-3 text-slate-600">{u.whatsapp}</td>
                      <td className="py-3 px-3">{u.role}</td>
                      <td className="py-3 px-3">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => toggleActive(u)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(u)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" /> Hapus
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

      {/* delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-red-500" /> Konfirmasi Hapus Pengguna
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Hapus akun pengguna{" "}
              <span className="font-semibold text-red-600">
                {deleting?.name ?? deleting?.username}
              </span>{" "}
              ?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Akun pengguna akan dipindahkan ke sampah
            </p>
          </div>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white"
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
    </div>
  );
}
