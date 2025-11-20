"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-client";
import {
  ArrowLeft,
  User as UserIcon,
  Key,
  Info,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

type ParticipantProfile = {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  lastCheckIn?: string | null;
  totalCheckIns: number;
};

type UserProfile = {
  id: string;
  username: string;
  name: string;
  whatsapp: string;
  role: string;
};

export default function ParticipantProfilePage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [participant, setParticipant] = useState<ParticipantProfile | null>(
    null
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!tripId) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/me`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal memuat profil");
        }

        setUserProfile(json.data.user as UserProfile);
        setParticipant(json.data.participant as ParticipantProfile);
      } catch (err: any) {
        console.error("Gagal memuat profil:", err);
        toast({
          title: "Gagal memuat profil",
          description: err?.message ?? "Terjadi kesalahan.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId, toast]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPassword(true);
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal mengubah password");
      }

      toast({
        title: "Berhasil",
        description: "Password berhasil diubah.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Gagal mengubah password",
        description: err?.message ?? "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Memuat profil...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Bar atas dengan tombol back */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.push(`/trip/${tripId}/overview`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Profil Peserta
          </h1>
          <p className="text-xs text-muted-foreground">
            Kelola informasi akun dan kata sandi kamu
          </p>
        </div>
      </div>

      {/* Info Akun (User) */}
      <Card className="p-4 border border-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-full bg-primary/10">
            <UserIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Informasi Akun
            </p>
            <p className="text-xs text-muted-foreground">
              Data login yang kamu gunakan untuk masuk
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nama</Label>
            <Input
              value={userProfile?.name ?? user?.name ?? ""}
              readOnly
              className="text-sm bg-muted/50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Username</Label>
            <Input
              value={userProfile?.username ?? ""}
              readOnly
              className="text-sm bg-muted/50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">WhatsApp</Label>
            <Input
              value={userProfile?.whatsapp ?? ""}
              readOnly
              className="text-sm bg-muted/50"
            />
          </div>
        </div>
      </Card>

      {/* Info Peserta Pada Trip */}
      {participant && (
        <Card className="p-4 border border-border space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-blue-50">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Informasi Peserta Trip Ini
              </p>
              <p className="text-xs text-muted-foreground">
                Data keikutsertaan kamu pada trip yang sedang berjalan
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nama Peserta</Label>
              <Input
                value={participant.name}
                readOnly
                className="text-sm bg-muted/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Alamat</Label>
              <Input
                value={participant.address}
                readOnly
                className="text-sm bg-muted/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Total Check-in</Label>
              <Input
                value={`${participant.totalCheckIns} kali`}
                readOnly
                className="text-sm bg-muted/50"
              />
            </div>

            {participant.lastCheckIn && (
              <div className="space-y-1">
                <Label className="text-xs">Terakhir Check-in</Label>
                <Input
                  value={participant.lastCheckIn}
                  readOnly
                  className="text-sm bg-muted/50"
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Ubah Password */}
      <Card className="p-4 border border-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-full bg-amber-50">
            <Key className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Ubah Kata Sandi
            </p>
            <p className="text-xs text-muted-foreground">
              Demi keamanan, jangan bagikan kata sandi ke siapapun
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Kata Sandi Lama</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={
                  showCurrentPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={
                  showNewPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Konfirmasi Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={
                  showConfirmPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={savingPassword}
            className="w-full mt-2"
          >
            {savingPassword && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Simpan Kata Sandi
          </Button>
        </form>
      </Card>
    </div>
  );
}
