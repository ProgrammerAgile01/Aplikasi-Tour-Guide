"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";
import {
  RefreshCw,
  Smartphone,
  WifiOff,
  MessageCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type WaStatus = {
  ok: boolean;
  ready: boolean;
  hasQR: boolean;
  lastStatusAt?: string;
  message?: string;
};

type WaLogItem = {
  id: string;
  to: string;
  template: string | null;
  content: string;
  status: "PENDING" | "SENDING" | "SUCCESS" | "FAILED";
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  participant?: { name: string | null } | null;
  trip?: { name: string | null } | null;
};

export default function AdminWhatsappPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrText, setQrText] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [logs, setLogs] = useState<WaLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/wa/status");
      const json = await res.json();
      setStatus(json);
      if (!json.ok) {
        toast({
          title: "Gagal memuat status WA",
          description: json.message || "Tidak bisa membaca status WA service.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Tidak bisa menghubungi API status WA.",
        variant: "destructive",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadLogs = async (targetPage?: number) => {
    try {
      setLogsLoading(true);
      const pageToLoad = targetPage ?? page;

      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (search.trim()) params.set("q", search.trim());
      params.set("take", String(pageSize));
      params.set("page", String(pageToLoad));

      const res = await fetch(`/api/wa/logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memuat log");
      }
      setLogs(json.items || []);
      setTotal(json.total || 0);
      setPage(json.page || pageToLoad);
    } catch (err: any) {
      toast({
        title: "Gagal Memuat Log",
        description: err?.message || "Terjadi kesalahan saat memuat log.",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!qrOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wa/status");
        const json = await res.json();
        setStatus(json);

        // kalau sudah ready, tutup modal QR otomatis
        if (json?.ok && json.ready) {
          toast({
            title: "WhatsApp Terhubung",
            description:
              "Perangkat berhasil login. Pengiriman pesan siap digunakan.",
          });
          setQrOpen(false);
          clearInterval(interval);
        }
      } catch (err) {
        // boleh di-skip silently biar nggak spam toast
        console.error("Polling WA status error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [qrOpen]);

  const handleOpenQr = async () => {
    try {
      setQrLoading(true);
      const res = await fetch("/api/wa/qr");
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "QR belum tersedia");
      }
      setQrText(json.qr);
      setQrOpen(true);
    } catch (err: any) {
      toast({
        title: "Gagal Memuat QR",
        description:
          err?.message ||
          "Tidak dapat mengambil QR. Pastikan WA service berjalan.",
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnectLoading(true);

      const res = await fetch("/api/wa/disconnect", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Gagal disconnect");
      }

      toast({
        title: "Berhasil Logout",
        description:
          json.message || "WhatsApp telah diputus, QR baru akan muncul.",
      });

      // close modal konfirmasi
      setDisconnectOpen(false);

      // muat status lagi
      await loadStatus();

      // langsung buka modal QR biar admin tinggal scan
      setQrText(null); // reset QR lama
      setQrOpen(true);
    } catch (err: any) {
      toast({
        title: "Gagal Logout",
        description: err?.message || "Terjadi kesalahan saat logout.",
        variant: "destructive",
      });
    } finally {
      setDisconnectLoading(false);
    }
  };

  const renderStatusBadge = () => {
    if (!status?.ok) {
      return (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="w-3 h-3" />
          Offline
        </Badge>
      );
    }
    if (status.ready) {
      return (
        <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          <Smartphone className="w-3 h-3" />
          Connected
        </Badge>
      );
    }
    if (status.hasQR) {
      return (
        <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
          <MessageCircle className="w-3 h-3" />
          Menunggu Scan QR
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <WifiOff className="w-3 h-3" />
        Menyiapkan Client
      </Badge>
    );
  };

  const handleChangeStatusFilter = (value: string) => {
    setFilterStatus(value);
    // reset ke page 1 sekaligus reload
    loadLogs(1);
  };

  const handleSearch = () => {
    // reset ke page 1 saat cari
    loadLogs(1);
  };

  const fromIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, total);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel WhatsApp</h1>
          <p className="text-slate-600 mt-1">
            Monitor koneksi WhatsApp dan lihat riwayat pesan yang dikirimkan ke
            peserta.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Status WhatsApp</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Kelola koneksi WhatsApp untuk pengiriman notifikasi Trip.
            </p>
          </div>
          <div>{renderStatusBadge()}</div>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 text-sm text-slate-600">
            <div>
              <span className="font-medium">Terakhir update: </span>
              {status?.lastStatusAt
                ? new Date(status.lastStatusAt).toLocaleString("id-ID")
                : "-"}
            </div>
            {status?.message && (
              <div className="text-xs text-slate-500">{status.message}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="bg-transparent gap-2"
              onClick={loadStatus}
              disabled={loadingStatus}
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`}
              />
              Refresh Status
            </Button>
            <Button
              variant="outline"
              className="bg-transparent gap-2"
              onClick={handleOpenQr}
              disabled={qrLoading}
            >
              <Smartphone className="w-4 h-4" />
              {qrLoading ? "Mengambil QR..." : "Tampilkan QR"}
            </Button>
            <Button
              variant="outline"
              className="bg-transparent gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setDisconnectOpen(true)}
            >
              <XCircle className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Log Pesan WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex gap-2 items-center">
              <select
                className="h-9 px-3 border border-slate-200 rounded-md text-sm"
                value={filterStatus}
                onChange={(e) => handleChangeStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="PENDING">Pending</option>
                <option value="SENDING">Sending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => loadLogs(page)}
                disabled={logsLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1 ${
                    logsLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh Log
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Cari by nomor / nama / template..."
                className="w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              <Button onClick={handleSearch} disabled={logsLoading}>
                Cari
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Waktu</th>
                  <th className="px-3 py-2">Peserta</th>
                  <th className="px-3 py-2">Nomor</th>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Preview Pesan</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      {logsLoading
                        ? "Memuat log..."
                        : "Belum ada log WhatsApp."}
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2 align-top">
                        {new Date(item.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {item.participant?.name || "-"}
                      </td>
                      <td className="px-3 py-2 align-top">{item.to}</td>
                      <td className="px-3 py-2 align-top">
                        {item.trip?.name || "-"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5">
                          {item.template || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {item.status === "SUCCESS" && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            SUCCESS
                          </Badge>
                        )}
                        {item.status === "FAILED" && (
                          <Badge className="bg-red-100 text-red-700">
                            FAILED
                          </Badge>
                        )}
                        {item.status === "PENDING" && (
                          <Badge className="bg-amber-100 text-amber-700">
                            PENDING
                          </Badge>
                        )}
                        {item.status === "SENDING" && (
                          <Badge className="bg-blue-100 text-blue-700">
                            SENDING
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top max-w-xs">
                        <div className="line-clamp-3 whitespace-pre-wrap text-xs text-slate-600">
                          {item.content}
                        </div>
                        {item.error && (
                          <div className="mt-1 text-[11px] text-red-500">
                            Error: {item.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan{" "}
              <span className="font-medium">
                {fromIndex}-{toIndex}
              </span>{" "}
              dari <span className="font-medium">{total}</span> log
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => loadLogs(page - 1)}
                disabled={!hasPrev || logsLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>
              <span>
                Halaman{" "}
                <span className="font-semibold">
                  {page}/{totalPages}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => loadLogs(page + 1)}
                disabled={!hasNext || logsLoading}
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan QR WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            {qrText ? (
              <>
                <QRCodeCanvas value={qrText} size={240} />
                <p className="text-xs text-slate-500 text-center">
                  Buka WhatsApp &gt; Perangkat tertaut &gt; Tautkan perangkat,
                  lalu scan QR ini.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                QR belum tersedia. Coba klik Refresh Status dulu.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Disconnect */}
      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Putuskan Koneksi WhatsApp?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              WhatsApp akan logout dari perangkat ini. Untuk menghubungkan
              kembali, kamu harus scan QR lagi dari halaman ini.
            </p>
            <p className="text-xs text-slate-500">
              Pesan yang sudah terkirim tidak akan terpengaruh.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setDisconnectOpen(false)}
                disabled={disconnectLoading}
              >
                Batal
              </Button>
              <Button onClick={handleDisconnect} disabled={disconnectLoading}>
                {disconnectLoading && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                Putuskan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
