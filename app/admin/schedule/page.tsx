"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Send, Clock, MapPin, Map } from "lucide-react";

const LeafletMap = dynamic(
  () => import("./leaflet-picker").then((m) => m.LeafletPicker),
  { ssr: false }
);

/* ============================ TYPES ============================ */
interface ScheduleItem {
  id: string;
  tripId: string;
  day: number;
  date: string;
  time: string;
  category?: string | null;
  title: string;
  location: string;
  locationMapUrl?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;
  hints?: string[];
  description?: string;
  isChanged?: boolean;
  isAdditional?: boolean;
}
type TripStatus = "ongoing" | "completed";
interface Trip {
  id: string;
  name: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
}

/* ============================ UTILS ============================ */
function formatIdDate(d: Date) {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function buildDayDateOptions(trip?: Trip) {
  if (!trip?.startDate || !trip?.endDate)
    return [] as Array<{ day: number; dateText: string; label: string }>;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  const days: Array<{ day: number; dateText: string; label: string }> = [];
  let idx = 1;
  for (
    let d = new Date(start.getTime());
    d.getTime() <= end.getTime();
    d.setDate(d.getDate() + 1), idx++
  ) {
    const dateText = formatIdDate(d);
    days.push({ day: idx, dateText, label: `Hari ${idx} - ${dateText}` });
  }
  return days;
}

// === Util OSM (permalink & parser yang stabil) ===
function clampZoom(z?: number) {
  const n = Math.floor(Number.isFinite(z as number) ? (z as number) : 17);
  return Math.min(19, Math.max(1, n || 17));
}
function toFixed6(n: number) {
  return Number(n).toFixed(6);
}
function osmPermalink(lat: number, lon: number, zoom = 17) {
  const z = clampZoom(zoom);
  const la = toFixed6(lat);
  const lo = toFixed6(lon);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=${z}/${la}/${lo}`;
}
function osmSearchUrl(q: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
}
function parseLatLonFromOsmUrl(url?: string | null): {
  lat?: number;
  lon?: number;
} {
  if (!url) return {};
  try {
    const u = new URL(url);
    const mlat = u.searchParams.get("mlat");
    const mlon = u.searchParams.get("mlon");
    if (mlat && mlon) {
      const lat = parseFloat(mlat);
      const lon = parseFloat(mlon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    if (u.hash.startsWith("#map=")) {
      const parts = u.hash.replace("#map=", "").split("/");
      if (parts.length >= 3) {
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      }
    }
  } catch {}
  return {};
}

/* ============================ API HELPERS ============================ */
async function apiGetTrips(): Promise<Trip[]> {
  const url = new URL("/api/trips", window.location.origin);
  url.searchParams.set("take", "200");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memuat daftar trip.");
  return (json.items || []).map(
    (t: any) =>
      ["id", "name", "status", "startDate", "endDate"].reduce(
        (o, k) => ({ ...o, [k]: String(t[k]) }),
        {} as any
      ) as Trip
  );
}

type ScheduleCreatePayload = {
  tripId: string;
  day: number;
  dateText: string;
  timeText: string;
  category?: string | null;
  title: string;
  location: string;
  locationMapUrl?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;
  hints?: string[];
  description?: string;
  isChanged?: boolean;
  isAdditional?: boolean;
};
type ScheduleUpdatePayload = Partial<Omit<ScheduleCreatePayload, "tripId">>;

async function apiGetSchedules(tripId: string): Promise<ScheduleItem[]> {
  const url = new URL("/api/schedules", window.location.origin);
  url.searchParams.set("tripId", tripId);
  url.searchParams.set("take", "500");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memuat jadwal.");
  return (json.items || []).map((s: any) => ({
    id: String(s.id),
    tripId: String(s.tripId),
    day: Number(s.day),
    date: String(s.dateText),
    time: String(s.timeText ?? ""),
    category: s.category ?? null,
    title: String(s.title),
    location: String(s.location),
    locationMapUrl: s.locationMapUrl ?? null,
    locationLat:
      s.locationLat !== null && s.locationLat !== undefined
        ? Number(s.locationLat)
        : null,
    locationLon:
      s.locationLon !== null && s.locationLon !== undefined
        ? Number(s.locationLon)
        : null,
    hints: Array.isArray(s.hints) ? (s.hints as string[]) : undefined,
    description: s.description ? String(s.description) : "",
    isChanged: Boolean(s.isChanged),
    isAdditional: Boolean(s.isAdditional),
  })) as ScheduleItem[];
}

async function apiCreateSchedule(
  payload: ScheduleCreatePayload
): Promise<ScheduleItem> {
  const res = await fetch("/api/schedules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal menambah jadwal.");
  const s = json.item;
  return {
    id: String(s.id),
    tripId: String(s.tripId),
    day: Number(s.day),
    date: String(s.dateText),
    time: String(s.timeText ?? ""),
    category: s.category ?? null,
    title: String(s.title),
    location: String(s.location),
    locationMapUrl: s.locationMapUrl ?? null,
    locationLat:
      s.locationLat !== null && s.locationLat !== undefined
        ? Number(s.locationLat)
        : null,
    locationLon:
      s.locationLon !== null && s.locationLon !== undefined
        ? Number(s.locationLon)
        : null,
    hints: Array.isArray(s.hints) ? (s.hints as string[]) : undefined,
    description: s.description ? String(s.description) : "",
    isChanged: Boolean(s.isChanged),
    isAdditional: Boolean(s.isAdditional),
  };
}

async function apiUpdateSchedule(
  id: string,
  payload: ScheduleUpdatePayload
): Promise<ScheduleItem> {
  if (!id) throw new Error("ID wajib diisi pada URL.");
  const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, id }),
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal memperbarui jadwal.");
  const s = json.item;
  return {
    id: String(s.id),
    tripId: String(s.tripId),
    day: Number(s.day),
    date: String(s.dateText),
    time: String(s.timeText ?? ""),
    category: s.category ?? null,
    title: String(s.title),
    location: String(s.location),
    locationMapUrl: s.locationMapUrl ?? null,
    locationLat:
      s.locationLat !== null && s.locationLat !== undefined
        ? Number(s.locationLat)
        : null,
    locationLon:
      s.locationLon !== null && s.locationLon !== undefined
        ? Number(s.locationLon)
        : null,
    hints: Array.isArray(s.hints) ? (s.hints as string[]) : undefined,
    description: s.description ? String(s.description) : "",
    isChanged: Boolean(s.isChanged),
    isAdditional: Boolean(s.isAdditional),
  };
}

async function apiDeleteSchedule(id: string) {
  if (!id) throw new Error("ID wajib diisi.");
  const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "Gagal menghapus jadwal.");
}

/* ============================ PAGE ============================ */
export default function AdminSchedulePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    day: 1,
    date: "",
    time: "",
    category: "" as string,
    title: "",
    location: "",
    locationMapUrl: "",
    locationLat: null as number | null,
    locationLon: null as number | null,
    hints: [] as string[],
    description: "",
    isChanged: false,
    isAdditional: false,
  });

  // Picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCenter, setPickerCenter] = useState<{
    lat: number;
    lon: number;
  }>({ lat: -6.2, lon: 106.816666 });
  const [pickedLatLon, setPickedLatLon] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const pickedManuallyRef = useRef(false);

  // === anti-race untuk geocode ===
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeReqIdRef = useRef(0);

  // Trips
  useEffect(() => {
    let mounted = true;
    setLoadingTrips(true);
    apiGetTrips()
      .then((items) => {
        if (!mounted) return;
        setTrips(items);
        if (!selectedTripId && items.length > 0) {
          const ongoing = items.find((t) => t.status === "ongoing");
          setSelectedTripId(ongoing?.id || items[0].id);
        }
      })
      .catch((err: any) =>
        toast({
          title: "Gagal Memuat",
          description: err?.message || "Tidak bisa memuat daftar trip.",
          variant: "destructive",
        })
      )
      .finally(() => mounted && setLoadingTrips(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Schedules
  useEffect(() => {
    if (!selectedTripId) {
      setSchedules([]);
      return;
    }
    let mounted = true;
    setLoadingSchedules(true);
    apiGetSchedules(selectedTripId)
      .then((items) => mounted && setSchedules(items))
      .catch((err: any) =>
        toast({
          title: "Gagal Memuat Jadwal",
          description: err?.message || "Tidak bisa memuat jadwal trip.",
          variant: "destructive",
        })
      )
      .finally(() => mounted && setLoadingSchedules(false));
    return () => {
      mounted = false;
    };
  }, [selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId),
    [trips, selectedTripId]
  );
  const dayDateOptions = useMemo(
    () => buildDayDateOptions(selectedTrip),
    [selectedTrip]
  );

  useEffect(() => {
    if (!isAddDialogOpen) return;
    if (dayDateOptions.length > 0) {
      const first = dayDateOptions[0];
      setFormData((f) => ({ ...f, day: first.day, date: first.dateText }));
    }
  }, [isAddDialogOpen, dayDateOptions]);

  const filteredSchedules = useMemo(
    () => schedules.filter((s) => s.tripId === selectedTripId),
    [schedules, selectedTripId]
  );

  // === Auto-geocode (anti-race + bias Indonesia) ===
  useEffect(() => {
    // aktif saat add/edit dialog terbuka
    if (!isAddDialogOpen && !editingSchedule) return;

    const q = formData.location.trim();
    if (!q) return;

    // jangan override kalau user pilih manual dari peta
    if (pickedManuallyRef.current) return;

    // siapkan request id + abort sebelumnya
    geocodeReqIdRef.current += 1;
    const reqId = geocodeReqIdRef.current;
    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    (async () => {
      try {
        const u = new URL("/api/osm/geocode", window.location.origin);
        u.searchParams.set("q", q);

        // kirim 'near' untuk preferensi area (pakai center sekarang / titik terakhir)
        const nearLat =
          typeof formData.locationLat === "number"
            ? formData.locationLat
            : pickerCenter.lat;
        const nearLon =
          typeof formData.locationLon === "number"
            ? formData.locationLon
            : pickerCenter.lon;
        u.searchParams.set("near", `${nearLat},${nearLon}`);

        const res = await fetch(u.toString(), {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();

        // jangan terapkan kalau sudah ada request yang lebih baru
        if (reqId !== geocodeReqIdRef.current) return;

        if (json?.ok && json.found) {
          const lat = Number(json.lat);
          const lon = Number(json.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            setFormData((f) => ({
              ...f,
              locationLat: lat,
              locationLon: lon,
              locationMapUrl: osmPermalink(lat, lon, 17),
            }));
            return;
          }
        }
        // fallback → tetap isi search url agar linknya relevan
        setFormData((f) => ({
          ...f,
          locationLat: null,
          locationLon: null,
          locationMapUrl: osmSearchUrl(q),
        }));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // fallback diam-diam
        setFormData((f) => ({
          ...f,
          locationLat: null,
          locationLon: null,
          locationMapUrl: osmSearchUrl(q),
        }));
      }
    })();

    // cleanup
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.location, isAddDialogOpen, editingSchedule]);

  const handleAddHint = () =>
    setFormData((f) => ({ ...f, hints: [...f.hints, ""] }));
  const handleChangeHint = (idx: number, value: string) =>
    setFormData((f) => {
      const next = [...f.hints];
      next[idx] = value;
      return { ...f, hints: next };
    });
  const handleRemoveHint = (idx: number) =>
    setFormData((f) => {
      const next = [...f.hints];
      next.splice(idx, 1);
      return { ...f, hints: next };
    });

  const handleAddSchedule = async () => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip",
        description: "Silakan pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (!formData.title || !formData.location) {
        toast({
          title: "Validasi",
          description: "Judul & lokasi wajib diisi.",
          variant: "destructive",
        });
        return;
      }
      const created = await apiCreateSchedule({
        tripId: selectedTripId,
        day: formData.day,
        dateText: formData.date || "-",
        timeText: formData.time || "-",
        category: formData.category || null,
        title: formData.title,
        location: formData.location,
        locationMapUrl: formData.locationMapUrl || undefined,
        locationLat: formData.locationLat ?? undefined,
        locationLon: formData.locationLon ?? undefined,
        hints: formData.hints.filter(Boolean),
        description: formData.description || undefined,
        isChanged: formData.isChanged,
        isAdditional: formData.isAdditional,
      });
      setSchedules((cur) => [...cur, created]);
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Jadwal Ditambahkan",
        description: "Jadwal baru berhasil ditambahkan.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Menambahkan",
        description:
          err?.message || "Terjadi kesalahan saat menambahkan jadwal.",
        variant: "destructive",
      });
    }
  };

  const handleEditSchedule = (schedule: ScheduleItem) => {
    if (!schedule?.id) {
      toast({
        title: "Tidak Bisa Edit",
        description: "ID jadwal tidak ditemukan.",
        variant: "destructive",
      });
      return;
    }
    setEditingSchedule(schedule);
    const center =
      schedule.locationLat && schedule.locationLon
        ? { lat: schedule.locationLat, lon: schedule.locationLon }
        : parseLatLonFromOsmUrl(schedule.locationMapUrl || "");
    setPickerCenter({
      lat: (center as any).lat ?? -6.2,
      lon: (center as any).lon ?? 106.816666,
    });
    pickedManuallyRef.current = false;
    setFormData({
      day: schedule.day,
      date: schedule.date,
      time: schedule.time,
      category: schedule.category || "",
      title: schedule.title,
      location: schedule.location,
      locationMapUrl:
        schedule.locationLat != null && schedule.locationLon != null
          ? osmPermalink(schedule.locationLat, schedule.locationLon, 17)
          : schedule.locationMapUrl || osmSearchUrl(schedule.location),
      locationLat: schedule.locationLat ?? null,
      locationLon: schedule.locationLon ?? null,
      hints: schedule.hints ?? [],
      description: schedule.description || "",
      isChanged: schedule.isChanged || false,
      isAdditional: schedule.isAdditional || false,
    });
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule?.id) {
      toast({
        title: "Gagal Memperbarui",
        description: "ID wajib diisi pada URL.",
        variant: "destructive",
      });
      return;
    }
    try {
      const updated = await apiUpdateSchedule(editingSchedule.id, {
        day: formData.day,
        dateText: formData.date,
        timeText: formData.time,
        category: formData.category || null,
        title: formData.title,
        location: formData.location,
        locationMapUrl: formData.locationMapUrl || undefined,
        locationLat: formData.locationLat ?? undefined,
        locationLon: formData.locationLon ?? undefined,
        hints: formData.hints.filter(Boolean),
        description: formData.description || undefined,
        isChanged: formData.isChanged,
        isAdditional: formData.isAdditional,
      });
      setSchedules((cur) =>
        cur.map((s) => (s.id === updated.id ? updated : s))
      );
      setEditingSchedule(null);
      resetForm();
      toast({
        title: "Jadwal Diperbarui",
        description: "Perubahan jadwal berhasil disimpan.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Memperbarui",
        description:
          err?.message || "Terjadi kesalahan saat memperbarui jadwal.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!id) {
      toast({
        title: "Gagal Menghapus",
        description: "ID wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    const prev = schedules;
    setSchedules((cur) => cur.filter((s) => s.id !== id));
    try {
      await apiDeleteSchedule(id);
      toast({
        title: "Jadwal Dihapus",
        description: "Jadwal berhasil dihapus dari daftar.",
      });
    } catch (err: any) {
      setSchedules(prev);
      toast({
        title: "Gagal Menghapus",
        description: err?.message || "Terjadi kesalahan saat menghapus jadwal.",
        variant: "destructive",
      });
    }
  };

  const handleSendToParticipants = async () => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip",
        description: "Silakan pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(
          selectedTripId
        )}/send-schedule-whatsapp`,
        { method: "POST" }
      );
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal mengantrikan jadwal");
      }

      toast({
        title: "Diantrikan ke WhatsApp",
        description: `Jadwal dikirim ke ${json.participantCount} peserta via antrian WA.`,
      });

      // optional: trigger worker sekali setelah enqueue
      fetch("/api/wa/worker-send", { method: "POST" }).catch(() => {});
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim",
        description: err?.message || "Terjadi kesalahan saat mengirim jadwal.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      day: 1,
      date: "",
      time: "",
      category: "",
      title: "",
      location: "",
      locationMapUrl: "",
      locationLat: null,
      locationLon: null,
      hints: [],
      description: "",
      isChanged: false,
      isAdditional: false,
    });
    setPickedLatLon(null);
    pickedManuallyRef.current = false;
    geocodeAbortRef.current?.abort();
  };

  const schedulesByDay = useMemo(() => {
    const acc: Record<number, ScheduleItem[]> = {};
    filteredSchedules.forEach((s) => {
      if (!acc[s.day]) acc[s.day] = [];
      acc[s.day].push(s);
    });
    return acc;
  }, [filteredSchedules]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Jadwal & Itinerary
          </h1>
          <p className="text-slate-600 mt-1">
            Kelola jadwal perjalanan peserta
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSendToParticipants}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <Send size={16} />
            Kirim ke Peserta
          </Button>

          {/* ADD */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!selectedTripId}>
                <Plus size={16} />
                Tambah Jadwal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Jadwal Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Hari */}
                <div className="space-y-2">
                  <Label>Hari</Label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-md"
                    value={`${formData.day}|${formData.date}`}
                    onChange={(e) => {
                      const [dayStr, dateText] = e.target.value.split("|");
                      setFormData((f) => ({
                        ...f,
                        day: Number(dayStr),
                        date: dateText,
                      }));
                    }}
                  >
                    {buildDayDateOptions(
                      trips.find((t) => t.id === selectedTripId)
                    ).map((opt) => (
                      <option
                        key={opt.day}
                        value={`${opt.day}|${opt.dateText}`}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Contoh: Transportasi / Aktivitas / Makan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Waktu</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Judul Aktivitas</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Contoh: Trekking Pulau Komodo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => {
                      pickedManuallyRef.current = false;
                      setFormData({ ...formData, location: e.target.value });
                    }}
                    placeholder="Contoh: Komodo Airport"
                  />

                  {/* URL + tombol peta */}
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={formData.locationMapUrl}
                      placeholder="Tautan OpenStreetMap"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => {
                        const center = parseLatLonFromOsmUrl(
                          formData.locationMapUrl
                        );
                        setPickerCenter({
                          lat: center.lat ?? -6.2,
                          lon: center.lon ?? 106.816666,
                        });
                        setPickerOpen(true);
                      }}
                      title="Ambil Lokasi dari Peta"
                    >
                      <Map size={16} />
                    </Button>
                  </div>
                  {!!formData.locationMapUrl && (
                    <a
                      href={formData.locationMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 underline"
                    >
                      Buka di OpenStreetMap
                    </a>
                  )}
                  {(() => {
                    const p = parseLatLonFromOsmUrl(formData.locationMapUrl);
                    return typeof p.lat === "number" &&
                      typeof p.lon === "number" ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Titik: {p.lat.toFixed(6)}, {p.lon.toFixed(6)}
                      </p>
                    ) : formData.locationLat != null &&
                      formData.locationLon != null ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Titik: {formData.locationLat.toFixed(6)},{" "}
                        {formData.locationLon.toFixed(6)}
                      </p>
                    ) : null;
                  })()}
                </div>

                {/* Petunjuk */}
                <div className="space-y-2">
                  <Label>Petunjuk (Opsional)</Label>
                  <div className="space-y-2">
                    {formData.hints.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={h}
                          onChange={(e) => {
                            const next = [...formData.hints];
                            next[i] = e.target.value;
                            setFormData({ ...formData, hints: next });
                          }}
                          placeholder={`Petunjuk ${i + 1}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => {
                            const next = [...formData.hints];
                            next.splice(i, 1);
                            setFormData({ ...formData, hints: next });
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          hints: [...formData.hints, ""],
                        })
                      }
                    >
                      + Tambah Petunjuk
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Deskripsi (Opsional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Tambahan informasi tentang aktivitas ini..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isAdditional"
                      checked={formData.isAdditional}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isAdditional: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="isAdditional" className="font-normal">
                      Tandai sebagai Jadwal Tambahan
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isChanged"
                      checked={formData.isChanged}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isChanged: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="isChanged" className="font-normal">
                      Tandai sebagai Perubahan Jadwal
                    </Label>
                  </div>
                </div>

                <Button onClick={handleAddSchedule} className="w-full">
                  Simpan Jadwal
                </Button>
              </div>

              {/* Picker (Add) */}
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      Pilih Titik Lokasi (OpenStreetMap)
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="h-[420px] w-full rounded-md overflow-hidden border">
                      <LeafletMap
                        center={[pickerCenter.lat, pickerCenter.lon]}
                        zoom={12}
                        onPick={(lat, lon) => setPickedLatLon({ lat, lon })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        {pickedLatLon ? (
                          <>
                            Titik dipilih: {pickedLatLon.lat.toFixed(6)},{" "}
                            {pickedLatLon.lon.toFixed(6)}
                          </>
                        ) : (
                          <>Klik pada peta untuk memilih titik.</>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => {
                            setPickedLatLon(null);
                            setPickerOpen(false);
                          }}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={() => {
                            if (!pickedLatLon) return;
                            pickedManuallyRef.current = true;
                            const url = osmPermalink(
                              pickedLatLon.lat,
                              pickedLatLon.lon,
                              17
                            );
                            setFormData((f) => ({
                              ...f,
                              locationMapUrl: url,
                              locationLat: pickedLatLon.lat,
                              locationLon: pickedLatLon.lon,
                            }));
                            setPickerOpen(false);
                          }}
                        >
                          Gunakan Titik Ini
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Pilih Trip</Label>
            <select
              className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              disabled={loadingTrips}
            >
              <option value="">
                {loadingTrips ? "Memuat..." : "-- Pilih Trip --"}
              </option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} (
                  {trip.status === "ongoing" ? "Sedang Berjalan" : "Selesai"})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      {selectedTripId ? (
        <div className="space-y-6">
          {loadingSchedules ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Memuat jadwal…
              </CardContent>
            </Card>
          ) : Object.keys(
              filteredSchedules.reduce(
                (acc: Record<number, ScheduleItem[]>, s) => {
                  (acc[s.day] ||= []).push(s);
                  return acc;
                },
                {}
              )
            ).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">
                  Belum ada jadwal untuk trip ini.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Klik tombol "Tambah Jadwal" untuk memulai.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(
              filteredSchedules.reduce(
                (acc: Record<number, ScheduleItem[]>, s) => {
                  (acc[s.day] ||= []).push(s);
                  return acc;
                },
                {}
              )
            )
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, daySchedules]) => (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Hari {day} - {daySchedules[0]?.date}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {daySchedules.map((schedule) => {
                        const osmUrl =
                          typeof schedule.locationLat === "number" &&
                          typeof schedule.locationLon === "number"
                            ? osmPermalink(
                                schedule.locationLat,
                                schedule.locationLon,
                                17
                              )
                            : schedule.locationMapUrl ||
                              osmSearchUrl(schedule.location);

                        return (
                          <div
                            key={schedule.id}
                            className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Clock size={16} />
                                    <span className="font-semibold">
                                      {schedule.time}
                                    </span>
                                  </div>
                                  {schedule.isChanged && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                      Perubahan
                                    </span>
                                  )}
                                  {schedule.isAdditional && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                      Tambahan
                                    </span>
                                  )}
                                </div>

                                {!!schedule.category && (
                                  <p className="text-xs text-slate-500">
                                    Kategori: {schedule.category}
                                  </p>
                                )}

                                <h3 className="font-semibold text-slate-900">
                                  {schedule.title}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin size={14} />
                                  {schedule.location}
                                </div>

                                {osmUrl && (
                                  <Button
                                    asChild
                                    className="mt-2 w-full justify-center"
                                  >
                                    <a
                                      href={osmUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label="Lihat lokasi di OpenStreetMap"
                                      className="inline-flex items-center gap-2"
                                    >
                                      <MapPin size={16} />
                                      Lihat Lokasi di OpenStreetMap
                                    </a>
                                  </Button>
                                )}

                                {schedule.hints &&
                                  schedule.hints.length > 0 && (
                                    <ul className="list-disc pl-5 text-sm text-slate-600">
                                      {schedule.hints.map((h, i) => (
                                        <li key={i}>{h}</li>
                                      ))}
                                    </ul>
                                  )}
                                {schedule.description && (
                                  <p className="text-sm text-slate-600">
                                    {schedule.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  <Edit2 size={16} />
                                </Button>

                                <Dialog
                                  open={!!confirmDeleteId}
                                  onOpenChange={(o) =>
                                    !o && setConfirmDeleteId(null)
                                  }
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        setConfirmDeleteId(schedule.id)
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm">
                                    <DialogHeader>
                                      <DialogTitle>Hapus Jadwal?</DialogTitle>
                                    </DialogHeader>
                                    <p className="text-slate-600">
                                      Tindakan ini tidak bisa dibatalkan. Yakin
                                      ingin menghapus jadwal ini?
                                    </p>
                                    <div className="mt-4 flex gap-2">
                                      <Button
                                        variant="outline"
                                        className="bg-transparent flex-1"
                                        onClick={() => setConfirmDeleteId(null)}
                                      >
                                        Batal
                                      </Button>
                                      <Button
                                        className="flex-1"
                                        onClick={async () => {
                                          const id = confirmDeleteId;
                                          setConfirmDeleteId(null);
                                          if (!id) return;
                                          await handleDeleteSchedule(id);
                                        }}
                                      >
                                        Hapus
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              Silakan pilih trip terlebih dahulu untuk melihat jadwal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog EDIT */}
      <Dialog
        open={!!editingSchedule}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSchedule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Jadwal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hari</Label>
              <select
                className="w-full h-10 px-3 border border-slate-200 rounded-md"
                value={`${formData.day}|${formData.date}`}
                onChange={(e) => {
                  const [dayStr, dateText] = e.target.value.split("|");
                  setFormData((f) => ({
                    ...f,
                    day: Number(dayStr),
                    date: dateText,
                  }));
                }}
              >
                {buildDayDateOptions(
                  trips.find((t) => t.id === selectedTripId)
                ).map((opt) => (
                  <option key={opt.day} value={`${opt.day}|${opt.dateText}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Kategori (Opsional)</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Waktu</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Judul Aktivitas</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Lokasi</Label>
              <Input
                value={formData.location}
                onChange={(e) => {
                  pickedManuallyRef.current = false;
                  setFormData({ ...formData, location: e.target.value });
                }}
              />
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={formData.locationMapUrl}
                  placeholder="Tautan OpenStreetMap"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => {
                    const center = parseLatLonFromOsmUrl(
                      formData.locationMapUrl
                    );
                    setPickerCenter({
                      lat: center.lat ?? -6.2,
                      lon: center.lon ?? 106.816666,
                    });
                    setPickerOpen(true);
                  }}
                  title="Ambil Lokasi dari Peta"
                >
                  <Map size={16} />
                </Button>
              </div>
              {!!formData.locationMapUrl && (
                <a
                  href={formData.locationMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  Buka di OpenStreetMap
                </a>
              )}
              {(() => {
                const p = parseLatLonFromOsmUrl(formData.locationMapUrl);
                return typeof p.lat === "number" &&
                  typeof p.lon === "number" ? (
                  <p className="text-xs text-slate-500 mt-1">
                    Titik: {p.lat.toFixed(6)}, {p.lon.toFixed(6)}
                  </p>
                ) : formData.locationLat != null &&
                  formData.locationLon != null ? (
                  <p className="text-xs text-slate-500 mt-1">
                    Titik: {formData.locationLat.toFixed(6)},{" "}
                    {formData.locationLon.toFixed(6)}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Petunjuk */}
            <div className="space-y-2">
              <Label>Petunjuk (Opsional)</Label>
              <div className="space-y-2">
                {formData.hints.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h}
                      onChange={(e) => {
                        const next = [...formData.hints];
                        next[i] = e.target.value;
                        setFormData({ ...formData, hints: next });
                      }}
                      placeholder={`Petunjuk ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => {
                        const next = [...formData.hints];
                        next.splice(i, 1);
                        setFormData({ ...formData, hints: next });
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() =>
                    setFormData({ ...formData, hints: [...formData.hints, ""] })
                  }
                >
                  + Tambah Petunjuk
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isAdditional"
                  checked={formData.isAdditional}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isAdditional: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="edit-isAdditional" className="font-normal">
                  Jadwal Tambahan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isChanged"
                  checked={formData.isChanged}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isChanged: checked as boolean })
                  }
                />
                <Label htmlFor="edit-isChanged" className="font-normal">
                  Perubahan Jadwal
                </Label>
              </div>
            </div>
            <Button onClick={handleUpdateSchedule} className="w-full">
              Simpan Perubahan
            </Button>
          </div>

          {/* Picker (Edit) */}
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Pilih Titik Lokasi (OpenStreetMap)</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="h-[420px] w-full rounded-md overflow-hidden border">
                  <LeafletMap
                    center={[pickerCenter.lat, pickerCenter.lon]}
                    zoom={12}
                    onPick={(lat, lon) => setPickedLatLon({ lat, lon })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {pickedLatLon ? (
                      <>
                        Titik dipilih: {pickedLatLon.lat.toFixed(6)},{" "}
                        {pickedLatLon.lon.toFixed(6)}
                      </>
                    ) : (
                      <>Klik pada peta untuk memilih titik.</>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => {
                        setPickedLatLon(null);
                        setPickerOpen(false);
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => {
                        if (!pickedLatLon) return;
                        pickedManuallyRef.current = true;
                        const url = osmPermalink(
                          pickedLatLon.lat,
                          pickedLatLon.lon,
                          17
                        );
                        setFormData((f) => ({
                          ...f,
                          locationMapUrl: url,
                          locationLat: pickedLatLon.lat,
                          locationLon: pickedLatLon.lon,
                        }));
                        setPickerOpen(false);
                      }}
                    >
                      Gunakan Titik Ini
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </div>
  );
}
