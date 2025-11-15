"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Award,
  Lock,
  CheckCircle,
  MapPin,
  Camera,
  Ship,
  Mountain,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  location: string;
  condition: string;
}

export default function BadgesPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const { toast } = useToast();

  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    unlocked: 0,
    progress: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const getIcon = (iconName: string, size = 32) => {
    const className = "text-current";
    switch (iconName) {
      case "ship":
        return <Ship size={size} className={className} />;
      case "mountain":
        return <Mountain size={size} className={className} />;
      case "camera":
        return <Camera size={size} className={className} />;
      case "award":
        return <Award size={size} className={className} />;
      case "map-pin":
        return <MapPin size={size} className={className} />;
      case "check":
        return <CheckCircle size={size} className={className} />;
      default:
        return <Award size={size} className={className} />;
    }
  };

  const formatUnlockedAt = (value?: string | null) => {
    if (!value) return "";

    try {
      const d = new Date(value);

      // Format ke Bahasa Indonesia + timezone Asia/Jakarta
      const formatted = d.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `${formatted} WIB`;
    } catch {
      // fallback: kalau parsing gagal, tampilkan apa adanya
      return value ?? "";
    }
  };

  useEffect(() => {
    if (!tripId) return;

    const fetchBadges = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/trips/${tripId}/badges`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message ?? "Gagal memuat badge");

        setBadges(data.items);
        const unlockedCount = data.items.filter(
          (b: Badge) => b.unlocked
        ).length;
        const total = data.items.length || 1;
        setStats({
          total: data.items.length,
          unlocked: unlockedCount,
          progress: Math.round((unlockedCount / total) * 100),
        });
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Gagal memuat badge",
          description: err?.message ?? "Terjadi kesalahan.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, [tripId, toast]);

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Achievement Badges
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Koleksi pencapaian Anda selama perjalanan
        </p>
      </div>

      {/* Progress Summary */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/20 rounded-2xl">
            <Award size={32} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Progress Pencapaian</p>
            <p className="text-3xl font-bold text-foreground">
              {stats.unlocked}/{stats.total}
            </p>
            <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{stats.progress}%</p>
            <p className="text-xs text-muted-foreground">Selesai</p>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card className="p-4 text-sm text-muted-foreground">
          Memuat daftar badge...
        </Card>
      )}

      {/* Unlocked Badges */}
      {!isLoading && unlockedBadges.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">
            Badge Terbuka ({unlockedBadges.length})
          </h2>
          <div className="grid gap-3">
            {unlockedBadges.map((badge) => (
              <Card
                key={badge.id}
                className="p-4 border-2 border-green-200 bg-green-50/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500 rounded-xl text-white flex-shrink-0">
                    {getIcon(badge.icon, 28)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground">
                        {badge.name}
                      </h3>
                      <CheckCircle
                        size={20}
                        className="text-green-600 flex-shrink-0"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {badge.description}
                    </p>
                    <div className="mt-2 flex-col items-center gap-4 space-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {badge.location}
                      </span>
                      {badge.unlockedAt && (
                        <span>
                          Diraih: {formatUnlockedAt(badge.unlockedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {!isLoading && lockedBadges.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">
            Badge Terkunci ({lockedBadges.length})
          </h2>
          <div className="grid gap-3">
            {lockedBadges.map((badge) => (
              <Card
                key={badge.id}
                className="p-4 border border-border opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-xl text-muted-foreground flex-shrink-0 relative">
                    {getIcon(badge.icon, 28)}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                      <Lock size={20} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {badge.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {badge.location}
                      </span>
                      <span className="text-primary font-medium">
                        Syarat: {badge.condition}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <div className="text-center space-y-3">
          <p className="font-semibold text-foreground">Raih Semua Badge!</p>
          <p className="text-sm text-muted-foreground">
            Selesaikan semua agenda dan dapatkan badge eksklusif Master Trip
          </p>
          <Button
            onClick={() => router.push(`/trip/${tripId}/schedule`)}
            className="mt-2"
          >
            Lihat Jadwal
          </Button>
        </div>
      </Card>
    </div>
  );
}
