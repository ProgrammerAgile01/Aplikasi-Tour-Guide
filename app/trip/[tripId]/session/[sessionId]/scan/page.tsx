"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Info,
  Loader2,
  RefreshCw,
  Repeat,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ScanStatus = "requesting" | "scanning" | "success" | "error";

interface CameraDevice {
  id: string;
  label: string;
}

export default function ScanQRPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string; sessionId: string }>();
  const { toast } = useToast();

  const tripId = params.tripId;
  const sessionId = params.sessionId;

  const [status, setStatus] = useState<ScanStatus>("requesting");
  const [message, setMessage] = useState<string>("");
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCamIndex, setCurrentCamIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const html5LibRef = useRef<any | null>(null);
  const scannerRef = useRef<any | null>(null);
  const hasScannedRef = useRef(false);

  // -------------------------------------------------------
  // 1. Load library + daftar kamera sekali saat mount
  // -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("requesting");
        setMessage("Meminta izin kamera…");

        const { Html5Qrcode } = await import("html5-qrcode");
        html5LibRef.current = Html5Qrcode;

        const cams = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!cams || cams.length === 0) {
          setStatus("error");
          setMessage("Kamera tidak ditemukan di perangkat ini.");
          return;
        }

        const mapped: CameraDevice[] = cams.map((c: any) => ({
          id: c.id,
          label: c.label || "Kamera",
        }));
        setCameras(mapped);

        let initialIndex = 0;

        const backIndex = mapped.findIndex((c) =>
          /back|rear|belakang|environment/i.test(c.label)
        );

        if (backIndex >= 0) {
          initialIndex = backIndex;
        } else if (mapped.length > 1) {
          // fallback: kalau ada lebih dari 1 kamera, pakai yang terakhir
          initialIndex = mapped.length - 1;
        }

        setCurrentCamIndex(initialIndex);
        setStatus("scanning");
        setMessage("Arahkan kamera ke QR Code.");

        await startScanner(mapped[initialIndex].id);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          e?.message ||
            "Gagal mengakses kamera. Pastikan izin kamera diizinkan di browser."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------
  // 2. Start / restart scanner untuk kamera tertentu
  // -------------------------------------------------------
  async function startScanner(cameraId: string) {
    const Html5Qrcode = html5LibRef.current;
    if (!Html5Qrcode) return;

    // stop scanner lama kalau ada – pakai try/catch supaya
    // error "Cannot stop, scanner is not running" tidak meledak.
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }

    setStatus("scanning");
    setMessage("Sedang memindai…");

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    hasScannedRef.current = false;

    scanner
      .start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: 230 },
        async (decodedText: string) => {
          // callback on success decode
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // decodedText = isi QR, di sini kita anggap token
          const token = decodedText?.trim();
          if (!token) {
            setStatus("error");
            setMessage("QR tidak valid.");
            hasScannedRef.current = false;
            return;
          }

          try {
            setStatus("requesting");
            setMessage("Memverifikasi QR…");

            const res = await fetch("/api/checkins/qr/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
              credentials: "include",
            });

            const j = await res.json();
            if (!res.ok || !j?.ok) {
              throw new Error(j?.message || "QR tidak valid atau kadaluwarsa.");
            }

            const checkedAtIso: string = j.data?.checkedAt;
            const timeStr = checkedAtIso
              ? new Date(checkedAtIso).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            setCheckedAt(timeStr);
            setStatus("success");
            setMessage("QR berhasil dipindai.");
            setShowSuccessModal(true);

            // simpan status check-in ke localStorage (untuk overview / detail sesi)
            localStorage.setItem(
              `checkin-${tripId}-${sessionId}`,
              JSON.stringify({
                sessionId,
                checkedInAt: timeStr,
                method: "qr",
                timestamp: Date.now(),
              })
            );

            toast({
              title: "Berhasil!",
              description:
                "Kehadiran Anda telah dicatat di sistem melalui scan QR.",
            });

            if (Array.isArray(j.newBadges) && j.newBadges.length > 0) {
              j.newBadges.forEach((b: any) => {
                toast({
                  title: "🎉 Badge Baru!",
                  description: `Kamu mendapatkan badge "${b.name}"`,
                });
              });
            }

            // hentikan kamera setelah sukses
            try {
              await scanner.stop();
            } catch {
              // ignore
            }
            try {
              await scanner.clear();
            } catch {
              // ignore
            }
          } catch (e: any) {
            hasScannedRef.current = false;
            setStatus("error");
            setMessage(e?.message || "QR tidak valid atau sudah kedaluwarsa.");

            toast({
              title: "Gagal",
              description:
                e?.message || "QR tidak valid atau sudah kedaluwarsa.",
              variant: "destructive",
            });
          }
        },
        // error decode per-frame – dibiarkan silent
        () => {}
      )
      .catch((e: any) => {
        setStatus("error");
        setMessage(
          e?.message ||
            "Gagal memulai pemindaian. Coba muat ulang halaman atau periksa izin kamera."
        );
      });
  }

  // -------------------------------------------------------
  // 3. Ganti kamera
  // -------------------------------------------------------
  const handleSwitchCamera = async () => {
    if (!cameras.length) return;
    const nextIndex = (currentCamIndex + 1) % cameras.length;
    setCurrentCamIndex(nextIndex);
    const nextCam = cameras[nextIndex];
    setStatus("scanning");
    setMessage(`Beralih ke ${nextCam.label || "kamera lain"}…`);
    await startScanner(nextCam.id);
  };

  // -------------------------------------------------------
  // 4. Restart scan
  // -------------------------------------------------------
  const handleRestart = async () => {
    if (!cameras.length) return;
    hasScannedRef.current = false;
    setCheckedAt("");
    setStatus("scanning");
    setMessage("Sedang memindai ulang…");
    await startScanner(cameras[currentCamIndex].id);
  };

  // -------------------------------------------------------
  // 5. Cleanup saat unmount
  //    (dibungkus try/catch supaya error stop() tidak bocor)
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      (async () => {
        try {
          await scanner.stop();
        } catch {
          // ignore error "Cannot stop..." dsb
        }
        try {
          await scanner.clear();
        } catch {
          // ignore
        }
      })();
    };
  }, []);

  const backToDetail = () =>
    router.push(`/trip/${tripId}/session/${sessionId}`);

  const currentCameraLabel =
    cameras[currentCamIndex]?.label || "Kamera perangkat";

  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 flex flex-col min-h-[80vh]">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Kembali</span>
        </button>

        {/* Header & Instructions */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Scan QR Kehadiran
          </h1>
          <p className="text-sm text-muted-foreground">
            Arahkan kamera ke QR Code yang ditampilkan oleh admin / tour guide.
          </p>
        </div>

        <Card className="p-4 flex items-start gap-3 bg-muted/40 border-dashed">
          <Info className="w-4 h-4 mt-0.5 text-primary" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Agar tidak bingung saat izin kamera:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Saat pop-up izin kamera muncul, pilih{" "}
                <span className="font-semibold">Izinkan / Allow</span>.
              </li>
              <li>Pastikan QR Code terlihat penuh di dalam kotak bingkai.</li>
              <li>
                Kalau gambar buram, dekatkan sedikit dan tahan beberapa detik
                sampai terbaca.
              </li>
            </ol>
          </div>
        </Card>

        {/* Scanner Block */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          {/* Video scanner container */}
          <div className="relative w-72 max-w-full mx-auto">
            <div
              id="qr-reader"
              className="rounded-xl overflow-hidden bg-black"
              style={{ width: "100%", minHeight: "260px" }}
            />

            {/* Overlay frame + garis */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 rounded-xl border-2 border-primary/80 relative overflow-hidden">
                <div className="absolute inset-x-0 h-0.5 bg-primary/80 animate-pulse mt-[30%]" />
              </div>
            </div>
          </div>

          {/* Status text */}
          <div className="flex items-center gap-2 text-sm">
            {status === "requesting" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{message}</span>
              </>
            )}
            {status === "scanning" && (
              <>
                <Camera className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{message}</span>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium">{message}</span>
              </>
            )}
            {status === "error" && (
              <>
                <Info className="w-4 h-4 text-red-600" />
                <span className="text-red-600 text-sm">{message}</span>
              </>
            )}
          </div>

          {/* Kamera controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {cameras.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSwitchCamera}
              >
                <Repeat className="w-4 h-4" />
                Ganti Kamera
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRestart}
            >
              <RefreshCw className="w-4 h-4" />
              Mulai Ulang Scan
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Kamera aktif:{" "}
            <span className="font-medium text-foreground">
              {currentCameraLabel}
            </span>
          </p>
        </div>

        {/* Tombol back jika user mau keluar tanpa check-in */}
        {status !== "success" && (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={backToDetail}
            >
              Kembali tanpa Check-in
            </Button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Dialog
        open={showSuccessModal}
        onOpenChange={(open) => {
          setShowSuccessModal(open);
          if (!open && status === "success") {
            backToDetail();
          }
        }}
      >
        <DialogContent className="max-w-sm flex flex-col items-center">
          <DialogHeader className="flex items-center">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </span>
              <span>Check-in Berhasil</span>
            </DialogTitle>
            <DialogDescription className="text-sm mt-2 text-center">
              Kehadiran Anda untuk sesi ini telah tercatat menggunakan metode{" "}
              <span className="font-semibold">Scan QR</span>.
            </DialogDescription>
          </DialogHeader>

          <Card className="mt-2 p-3 bg-muted/40">
            <p className="text-xs text-muted-foreground text-center">
              Waktu Check-in
            </p>
            <p className="font-bold text-2xl text-foreground text-center">
              {checkedAt}
            </p>
          </Card>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setShowSuccessModal(false);
                backToDetail();
              }}
            >
              Kembali ke Detail Agenda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
