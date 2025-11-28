"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-client";

type Status = "loading" | "success" | "error";

export default function MagicLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tripId = searchParams.get("tripId");

  const { refreshSession } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  // Penahan supaya efek tidak jalan berkali-kali (StrictMode / re-render)
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Tautan login tidak valid.");
      return;
    }

    if (hasHandledRef.current) return;
    hasHandledRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/magic-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "same-origin",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          setStatus("error");
          setMessage(
            json?.message ??
              "Tautan login sudah kedaluwarsa atau tidak dapat digunakan."
          );
          return;
        }

        // Cookie sudah diset → refresh session di AuthProvider
        try {
          await refreshSession();
        } catch (e) {
          console.error("refreshSession error:", e);
        }

        setStatus("success");
        setMessage("Berhasil login. Mengarahkan ke halaman trip...");

        // Tentukan redirect
        let redirectUrl = "/participant/select-trip";
        if (tripId) {
          redirectUrl = `/trip/${tripId}/overview`;
        } else if (Array.isArray(json.trips) && json.trips.length === 1) {
          redirectUrl = `/trip/${json.trips[0].id}/overview`;
        }

        setTimeout(() => {
          router.replace(redirectUrl);
        }, 800);
      } catch (e) {
        console.error("magic login error", e);
        setStatus("error");
        setMessage("Terjadi kesalahan saat memproses tautan login.");
      }
    })();

    // ⚠️ jangan taruh refreshSession di deps biar nggak loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-6 shadow-lg">
        {status === "loading" && (
          <div className="flex flex-col items-center text-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-slate-700 font-medium">
              Memproses tautan login...
            </p>
            <p className="text-slate-500 text-sm">
              Harap tunggu sebentar, kamu akan diarahkan ke halaman trip.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <p className="text-slate-700 font-medium">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-slate-700 font-medium">{message}</p>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Kembali ke Halaman Login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
