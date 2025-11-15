"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Star, ThumbsUp, ThumbsDown, Map, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Trip {
  id: string;
  name: string;
  status: string;
}

interface ParticipantLite {
  id: string;
  name: string;
  whatsapp: string | null;
}

interface FeedbackItem {
  id: string;
  tripId: string;
  participantId: string | null;
  rating: number;
  notes: string | null;
  createdAt: string;
  participant?: ParticipantLite | null;
}

interface FeedbackStats {
  total: number;
  avgRating: number | null;
  byRating: Record<number, number>;
}

export default function AdminFeedbackPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // ───────────────── Trips ─────────────────
  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal memuat trips");
      }
      setTrips(json.items ?? json.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat trips",
        variant: "destructive",
      });
    } finally {
      setLoadingTrips(false);
    }
  }

  // ───────────────── Feedback ─────────────────
  useEffect(() => {
    if (selectedTripId) {
      loadFeedbacks(selectedTripId);
    } else {
      setFeedbacks([]);
      setStats(null);
    }
  }, [selectedTripId]);

  async function loadFeedbacks(tripId: string) {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch(
        `/api/feedbacks?tripId=${encodeURIComponent(tripId)}`
      );
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal memuat umpan balik");
      }

      setFeedbacks(json.items ?? json.data ?? []);
      setStats(json.stats ?? null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Gagal memuat umpan balik",
        variant: "destructive",
      });
    } finally {
      setLoadingFeedbacks(false);
    }
  }

  // ───────────────── Filter di tabel ─────────────────
  const filteredFeedbacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return feedbacks;

    return feedbacks.filter((f) => {
      const name = f.participant?.name?.toLowerCase() ?? "";
      const notes = f.notes?.toLowerCase() ?? "";
      const ratingStr = String(f.rating);
      return name.includes(q) || notes.includes(q) || ratingStr.includes(q);
    });
  }, [feedbacks, searchQuery]);

  const computedStats = useMemo(() => {
    if (stats) return stats;

    // fallback kalau API tidak kirim stats
    const total = feedbacks.length;
    if (!total)
      return {
        total: 0,
        avgRating: null,
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const f of feedbacks) {
      sum += f.rating;
      if (f.rating >= 1 && f.rating <= 5) {
        byRating[f.rating] = (byRating[f.rating] ?? 0) + 1;
      }
    }
    return {
      total,
      avgRating: sum / total,
      byRating,
    };
  }, [stats, feedbacks]);

  const lowRatingCount =
    (computedStats.byRating?.[1] ?? 0) + (computedStats.byRating?.[2] ?? 0);

  // helper format tanggal
  function formatDateTime(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= rating;
          return (
            <Star
              key={i}
              className={
                "w-4 h-4 " +
                (filled ? "fill-yellow-400 text-yellow-400" : "text-slate-300")
              }
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Umpan Balik</h1>
          <p className="text-slate-600 mt-1">
            Lihat rangkuman umpan balik peserta untuk setiap trip.
          </p>
        </div>
      </div>

      {/* Pilih Trip */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Map className="text-blue-600" size={20} />
            <div className="flex-1">
              <Label
                htmlFor="trip-select"
                className="text-sm font-medium text-slate-700 mb-2 block"
              >
                Pilih Trip
              </Label>
              <Select
                value={selectedTripId}
                onValueChange={(v) => setSelectedTripId(v)}
              >
                <SelectTrigger id="trip-select" className="w-full">
                  <SelectValue
                    placeholder={
                      loadingTrips
                        ? "Memuat trips..."
                        : "Pilih trip untuk melihat umpan balik..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      <div className="flex items-center gap-2">
                        <span>{trip.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            trip.status === "ongoing"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {trip.status === "ongoing" ? "Berjalan" : "Selesai"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTripId ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {computedStats.total}
                    </p>
                    <p className="text-sm text-slate-600">Total Umpan Balik</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {computedStats.avgRating
                        ? computedStats.avgRating.toFixed(1)
                        : "–"}
                      <span className="text-base text-slate-500"> / 5</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Rata-rata Rating Peserta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {lowRatingCount}
                    </p>
                    <p className="text-sm text-slate-600">
                      Rating 1–2 (Butuh perhatian)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <Input
                  placeholder="Cari umpan balik berdasarkan nama peserta, rating, atau catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daftar Feedback: mobile = cards, desktop = tabel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Daftar Umpan Balik</CardTitle>
            </CardHeader>
            <CardContent>
              {/* MOBILE: card list */}
              <div className="md:hidden space-y-3">
                {loadingFeedbacks ? (
                  <p className="py-4 text-sm text-slate-500">
                    Memuat umpan balik…
                  </p>
                ) : filteredFeedbacks.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500 text-center">
                    Belum ada umpan balik untuk trip ini.
                  </p>
                ) : (
                  filteredFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="border border-slate-200 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(fb.createdAt)}
                          </p>
                          <p className="font-semibold text-slate-900">
                            {fb.participant?.name ?? (
                              <span className="text-slate-400">
                                (Peserta tidak terhubung)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          {renderStars(fb.rating)}
                          <p className="text-xs text-slate-500 mt-1">
                            {fb.rating}/5
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        {fb.notes || (
                          <span className="text-slate-400">
                            Tidak ada catatan
                          </span>
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Tanggal
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Peserta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Rating
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingFeedbacks ? (
                      <tr>
                        <td colSpan={4} className="py-4 px-4">
                          Memuat umpan balik…
                        </td>
                      </tr>
                    ) : filteredFeedbacks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-slate-500"
                        >
                          Belum ada umpan balik untuk trip ini.
                        </td>
                      </tr>
                    ) : (
                      filteredFeedbacks.map((fb) => (
                        <tr
                          key={fb.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 px-4 text-slate-600 text-sm">
                            {formatDateTime(fb.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {fb.participant?.name ?? (
                              <span className="text-slate-400">
                                (Peserta tidak terhubung)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div className="flex items-center gap-2">
                              {renderStars(fb.rating)}
                              <span className="text-sm text-slate-500">
                                {fb.rating}/5
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                            {fb.notes || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Pilih Trip Terlebih Dahulu
            </h3>
            <p className="text-slate-500">
              Silakan pilih trip di atas untuk melihat rangkuman umpan balik.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
