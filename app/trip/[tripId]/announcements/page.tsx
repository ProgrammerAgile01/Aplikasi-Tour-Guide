"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";

type Priority = "NORMAL" | "IMPORTANT";
interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  isPinned: boolean;
  createdAt: string;
}

export default function AnnouncementsPage({
  params,
}: {
  params: { tripId: string };
}) {
  const { tripId } = params;

  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const url = new URL("/api/announcements", window.location.origin);
        url.searchParams.set("tripId", tripId);
        url.searchParams.set("take", "200");
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "Gagal memuat pengumuman");
        if (mounted) setData(json.items as Announcement[]);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Terjadi kesalahan");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tripId]);

  const announcements = useMemo(() => data, [data]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengumuman Resmi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informasi penting untuk perjalanan Anda
        </p>
      </div>

      {/* States */}
      {loading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Announcements List */}
      {!loading && !err && (
        <div className="space-y-3">
          {announcements.map((a) => {
            const high = a.priority === "IMPORTANT" || a.isPinned;
            // format waktu singkat (opsional)
            const timeText = new Date(a.createdAt).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={a.id}
                className={`p-4 border ${
                  high ? "border-orange-200 bg-orange-50/50" : "border-border"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground flex-1">
                      {a.title}
                    </h3>
                    {high && (
                      <AlertCircle
                        size={18}
                        className="text-orange-600 flex-shrink-0"
                      />
                    )}
                  </div>

                  <p className="text-sm text-foreground leading-relaxed">
                    {a.content}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={14} />
                    {timeText}
                  </div>
                </div>
              </Card>
            );
          })}
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada pengumuman.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
