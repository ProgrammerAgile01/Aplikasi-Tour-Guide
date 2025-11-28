"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2, Pencil, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserTripRow {
  roleOnTrip?: string | null;
  trip?: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
}

interface UserRow {
  id: string;
  username: string;
  name: string;
  whatsapp: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  userTrips?: UserTripRow[];
}

interface TripOption {
  id: string;
  name: string;
}

const pageSize = 15; // jumlah user per halaman

type FormMode = "create" | "edit";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // filter trip
  const [tripFilter, setTripFilter] = useState<string>("ALL");

  // pagination
  const [page, setPage] = useState(1);

  // === STATE FORM TAMBAH/EDIT ===
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [saving, setSaving] = useState(false);
  const [formUserId, setFormUserId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formPassword, setFormPassword] = useState(""); // create
  const [formNewPassword, setFormNewPassword] = useState(""); // edit
  const [formNewPasswordConfirm, setFormNewPasswordConfirm] = useState(""); // edit
  const [formRole, setFormRole] = useState("ADMIN");
  const [formIsActive, setFormIsActive] = useState(true); // dipakai untuk edit backend saja (tanpa field UI)

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      // ambil semua user, tanpa parameter q (search dilakukan di client)
      const res = await fetch(`/api/users?take=200`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "Gagal memuat users");
      setUsers(json.items ?? []);
      setPage(1); // reset ke halaman pertama setiap reload
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err?.message || "Gagal memuat pengguna",
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
        description: err?.message || "Gagal update pengguna",
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
        description: err?.message || "Gagal menghapus pengguna",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // === HANDLER FORM TAMBAH / EDIT ===
  function openCreateForm() {
    setFormMode("create");
    setFormUserId(null);
    setFormUsername("");
    setFormName("");
    setFormWhatsapp("");
    setFormPassword("");
    setFormNewPassword("");
    setFormNewPasswordConfirm("");
    setFormRole("ADMIN");
    setFormIsActive(true);
    setFormOpen(true);
  }

  function openEditForm(u: UserRow) {
    setFormMode("edit");
    setFormUserId(u.id);
    setFormUsername(u.username);
    setFormName(u.name);
    setFormWhatsapp(u.whatsapp);
    setFormPassword("");
    setFormNewPassword("");
    setFormNewPasswordConfirm("");
    setFormRole(u.role || "ADMIN");
    setFormIsActive(u.isActive);
    setFormOpen(true);
  }

  async function handleSave() {
    if (formMode === "create") {
      // validasi simple di client
      if (!formUsername.trim() || !formName.trim() || !formWhatsapp.trim()) {
        toast({
          title: "Validasi",
          description: "Username, nama dan WhatsApp wajib diisi",
          variant: "destructive",
        });
        return;
      }
      if (!formPassword || formPassword.length < 6) {
        toast({
          title: "Validasi",
          description: "Password minimal 6 karakter",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formUsername.trim(),
            name: formName.trim(),
            whatsapp: formWhatsapp.trim(),
            password: formPassword,
            // role tidak dikirim; backend selalu pakai "ADMIN"
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "Gagal membuat pengguna");

        // tambahkan ke list (di depan)
        setUsers((prev) => [json.item, ...prev]);

        toast({
          title: "Berhasil",
          description: "Pengguna ADMIN baru berhasil dibuat",
        });
        setFormOpen(false);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Error",
          description: err?.message || "Gagal membuat pengguna",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    } else {
      // EDIT
      if (!formUserId) return;
      if (!formName.trim() || !formWhatsapp.trim()) {
        toast({
          title: "Validasi",
          description: "Nama dan WhatsApp wajib diisi",
          variant: "destructive",
        });
        return;
      }

      // kalau mau ubah password
      let passwordToSend: string | undefined = undefined;
      if (formNewPassword || formNewPasswordConfirm) {
        if (formNewPassword.length < 6) {
          toast({
            title: "Validasi",
            description: "Password baru minimal 6 karakter",
            variant: "destructive",
          });
          return;
        }
        if (formNewPassword !== formNewPasswordConfirm) {
          toast({
            title: "Validasi",
            description: "Konfirmasi password baru tidak sama",
            variant: "destructive",
          });
          return;
        }
        passwordToSend = formNewPassword;
      }

      setSaving(true);
      try {
        const body: any = {
          name: formName.trim(),
          whatsapp: formWhatsapp.trim(),
          // role & isActive tidak diubah dari form, kecuali kamu mau tambahkan lagi
        };
        if (passwordToSend) {
          body.password = passwordToSend;
        }

        const res = await fetch(
          `/api/users/${encodeURIComponent(formUserId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "Gagal update pengguna");

        setUsers((prev) =>
          prev.map((u) => (u.id === json.item.id ? { ...u, ...json.item } : u))
        );

        toast({
          title: "Berhasil",
          description: passwordToSend
            ? "Data pengguna & password berhasil diperbarui"
            : "Data pengguna berhasil diperbarui",
        });
        setFormOpen(false);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Error",
          description: err?.message || "Gagal update pengguna",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
  }

  // reset halaman kalau filter atau search berubah
  useEffect(() => {
    setPage(1);
  }, [q, tripFilter]);

  // Kumpulkan list trip unik dari relasi userTrips → untuk dropdown filter
  const tripOptions: TripOption[] = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      u.userTrips?.forEach((ut) => {
        if (ut.trip?.id && ut.trip?.name) {
          map.set(ut.trip.id, ut.trip.name);
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Filter user berdasarkan q dan tripFilter
  const filteredUsers = useMemo(() => {
    const term = q.trim().toLowerCase();

    return users.filter((u) => {
      // filter berdasarkan teks pencarian
      const matchSearch = term
        ? u.name?.toLowerCase().includes(term) ||
          u.username?.toLowerCase().includes(term) ||
          u.whatsapp?.toLowerCase().includes(term) ||
          u.role?.toLowerCase().includes(term)
        : true;

      // filter berdasarkan trip
      const matchTrip =
        tripFilter === "ALL"
          ? true
          : (u.userTrips ?? []).some((ut) => ut.trip?.id === tripFilter);

      return matchSearch && matchTrip;
    });
  }, [users, q, tripFilter]);

  // pagination client-side
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedUsers = filteredUsers.slice(start, end);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pengguna</h1>
          <p className="text-slate-600 mt-1">Kelola akun pengguna aplikasi</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex flex-1 items-center gap-2">
              <Search className="text-slate-400" />
              <Input
                placeholder="Cari nama, username, WhatsApp atau role..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 whitespace-nowrap">
                Filter Trip:
              </span>
              <Select
                value={tripFilter}
                onValueChange={(value) => setTripFilter(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Pilih trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua trip</SelectItem>
                  {tripOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Ketik untuk mencari, daftar akan difilter otomatis. Tombol
            &quot;Muat ulang&quot; untuk refresh data dari server.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Daftar Pengguna</CardTitle>
            <div className="flex flex-wrap justify-end items-center gap-2">
              <Button size="sm" onClick={openCreateForm}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Muat ulang
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left">Nama</th>
                  <th className="py-2 px-3 text-left">Username</th>
                  <th className="py-2 px-3 text-left">WhatsApp</th>
                  <th className="py-2 px-3 text-left">Trip</th>
                  <th className="py-2 px-3 text-left">Role</th>
                  <th className="py-2 px-3 text-left">Aktif</th>
                  <th className="py-2 px-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Tidak ada pengguna yang cocok dengan filter
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-3">{u.name}</td>
                      <td className="py-3 px-3 text-slate-600">{u.username}</td>
                      <td className="py-3 px-3 text-slate-600">{u.whatsapp}</td>
                      <td className="py-3 px-3">
                        {u.userTrips && u.userTrips.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.userTrips.map((ut, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                              >
                                {ut.trip?.name ?? "-"}
                                {/* {ut.roleOnTrip && (
                                  <span className="ml-1 text-[10px] uppercase text-slate-400">
                                    ({ut.roleOnTrip})
                                  </span>
                                )} */}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            -
                          </span>
                        )}
                      </td>
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
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(u)}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(u)}
                            className="text-red-600 hover:bg-red-600/10"
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

          {/* Pagination controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4 text-sm text-slate-600">
              <div>
                Menampilkan{" "}
                <span className="font-semibold">
                  {start + 1}–{Math.min(end, filteredUsers.length)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold">{filteredUsers.length}</span>{" "}
                pengguna
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

      {/* dialog TAMBAH / EDIT */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Tambah User Admin" : "Edit Pengguna"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Username
              </label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="mis. admin01"
                disabled={formMode === "edit"}
              />
              {formMode === "edit" && (
                <p className="text-[11px] text-slate-400">
                  Username tidak bisa diubah.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nama</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                WhatsApp
              </label>
              <Input
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxxx"
              />
            </div>

            {formMode === "create" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Password
                </label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                />
              </div>
            )}

            {formMode === "create" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Role
                </label>
                <>
                  <Input value="ADMIN" disabled />
                  <p className="text-[11px] text-slate-400">
                    User yang dibuat dari sini otomatis sebagai <b>ADMIN</b>.
                  </p>
                </>
              </div>
            )}

            {formMode === "edit" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Password baru (opsional)
                  </label>
                  <Input
                    type="password"
                    value={formNewPassword}
                    onChange={(e) => setFormNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Konfirmasi password baru
                  </label>
                  <Input
                    type="password"
                    value={formNewPasswordConfirm}
                    onChange={(e) => setFormNewPasswordConfirm(e.target.value)}
                    placeholder="Ulangi password baru"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {formMode === "create" ? "Simpan" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={cancelDelete}
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
