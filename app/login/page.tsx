"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Compass, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { playVoiceGreeting } from "@/lib/voice-greeting";

type SettingsApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    logoUrl: string | null;
    tripName: string;
    description: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession, user } = useAuth();

  const [identifier, setIdentifier] = useState(""); // username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tripName, setTripName] = useState<string>("Teman Wisata");
  const [description, setDescription] = useState<string>(
    "Sistem Pemandu Wisata Eksekutif"
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json: SettingsApiResponse = await res.json();

        if (!res.ok || !json.ok || !json.data) {
          if (json.message) {
            console.warn("Gagal load settings:", json.message);
          }
          return;
        }

        setLogoUrl(json.data.logoUrl ?? null);
        if (json.data.tripName) setTripName(json.data.tripName);
        if (json.data.description) setDescription(json.data.description);
      } catch (err) {
        console.warn("Error load settings login:", err);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    // kalau mau auto-redirect setelah login, logic bisa di sini
    // if (user) {
    //   if (user.role === "ADMIN") router.push("/admin/dashboard");
    //   else router.push("/trip/komodo-2025/overview");
    // }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "same-origin",
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || !json?.ok) {
        toast({
          title: "Login Gagal",
          description:
            // json?.message || "Cek kembali username / WhatsApp dan sandi Anda.",
            "Cek kembali username dan kata sandi Anda.",
          variant: "destructive",
        });
        return;
      }

      await refreshSession();

      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${json?.user?.name ?? "User"}`,
      });

      if (json?.user?.name) {
        const firstTripName: string =
          json?.trips?.[0]?.name ?? tripName ?? "Perjalanan Anda";
        playVoiceGreeting(json.user.name, firstTripName);
      }
    } catch (err: any) {
      // ini cuma error jaringan / crash tak terduga
      console.error("login error:", err);
      toast({
        title: "Terjadi kesalahan",
        description: err?.message || "Gagal menghubungi server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo Trip"
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <img
                  src="/logo-temanwisata-bg-clear.png"
                  alt="Teman Wisata"
                  className="w-16 h-16 object-contain"
                />
              )}
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {tripName}
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="masukkan username Anda"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-12"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
