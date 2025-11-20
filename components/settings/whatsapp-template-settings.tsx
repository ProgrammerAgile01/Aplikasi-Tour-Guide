"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Trip = {
  id: string;
  name: string;
  status: "ongoing" | "completed";
};

type TemplateType =
  | "SCHEDULE"
  | "PARTICIPANT_REGISTERED_NEW"
  | "PARTICIPANT_REGISTERED_EXISTING"
  | "ANNOUNCEMENT";

type TemplateItem = {
  type: TemplateType;
  name: string;
  content: string;
  defaultContent: string;
};

const TYPE_LABEL: Record<TemplateType, string> = {
  SCHEDULE: "Kirim Jadwal Trip",
  PARTICIPANT_REGISTERED_NEW: "Peserta Didaftarkan (Akun Baru)",
  PARTICIPANT_REGISTERED_EXISTING: "Peserta Didaftarkan (Akun Sudah Ada)",
  ANNOUNCEMENT: "Pengumuman Trip",
};

const TYPE_DESC: Record<TemplateType, string> = {
  SCHEDULE:
    "Pesan yang dikirim ke semua peserta saat admin menekan tombol “Kirim ke Peserta” di menu Jadwal.",
  PARTICIPANT_REGISTERED_NEW:
    "Pesan yang dikirim ketika peserta baru dibuat dan sekaligus dibuatkan akun login.",
  PARTICIPANT_REGISTERED_EXISTING:
    "Pesan yang dikirim ketika nomor WA peserta ditambahkan ke trip, tapi akunnya sudah pernah dibuat sebelumnya.",
  ANNOUNCEMENT:
    "Pesan yang dikirim ke semua peserta ketika admin membuat pengumuman baru di menu Pengumuman.",
};

const TYPE_PLACEHOLDERS: Record<TemplateType, string[]> = {
  SCHEDULE: [
    "{{participant_name}}",
    "{{trip_name}}",
    "{{trip_location}}",
    "{{trip_date_range}}",
    "{{schedule_block}}",
  ],
  PARTICIPANT_REGISTERED_NEW: [
    "{{participant_name}}",
    "{{trip_name}}",
    "{{trip_location}}",
    "{{login_username}}",
    "{{login_password}}",
    "{{login_url}}",
  ],
  PARTICIPANT_REGISTERED_EXISTING: [
    "{{participant_name}}",
    "{{trip_name}}",
    "{{trip_location}}",
    "{{login_username}}",
    "{{login_url}}",
  ],
  ANNOUNCEMENT: [
    "{{participant_name}}",
    "{{trip_name}}",
    "{{trip_location}}",
    "{{announcement_title}}",
    "{{announcement_content}}",
    "{{priority}}",
    "{{priority_header}}",
  ],
};

// ===== Helper untuk preview (dummy data) =====
function buildPreview(
  type: TemplateType,
  tpl: TemplateItem | undefined
): string {
  const raw = tpl?.content || tpl?.defaultContent || "";
  if (!raw) return "";

  // dummy data
  const vars: Record<string, string> = {
    participant_name: "Budi",
    trip_name: "Labuan Bajo Explorer 2025",
    trip_location: "Labuan Bajo, NTT",
    trip_date_range: "12 Mei 2025 s/d 15 Mei 2025",
    schedule_block:
      "🗓 Hari 1, 12 Mei 2025\n\n" +
      "⏰ 08:00 — Penjemputan di Bandara\n" +
      "📍 Lokasi: Komodo Airport",
    login_username: "budi1234@trip.com",
    login_password: "rahasia123",
    login_url: "https://trip.agilestore.id/login",
    announcement_title: "Perubahan Jam Keberangkatan",
    announcement_content:
      "Jam keberangkatan kapal dimajukan menjadi pukul 07.00 WITA. Mohon hadir 30 menit lebih awal di lobi hotel.",
    priority: type === "ANNOUNCEMENT" ? "important" : "normal",
    priority_header:
      type === "ANNOUNCEMENT"
        ? "❗ *Pengumuman PENTING untuk Trip Anda*"
        : "📢 Pengumuman untuk Trip Anda",
  };

  return raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const v = vars[key];
    return v !== undefined ? v : match; // kalau gak dikenal biarkan apa adanya
  });
}

export function WhatsAppTemplateSettingsCard() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeType, setActiveType] = useState<TemplateType>("SCHEDULE");

  // ambil daftar trip
  useEffect(() => {
    let mounted = true;
    setLoadingTrips(true);

    (async () => {
      try {
        const url = new URL("/api/trips", window.location.origin);
        url.searchParams.set("take", "200");
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal memuat daftar trip");
        }

        const items: Trip[] = (json.items || []).map((t: any) => ({
          id: String(t.id),
          name: String(t.name),
          status: String(t.status) as any,
        }));

        setTrips(items);

        if (!selectedTripId && items.length > 0) {
          const ongoing = items.find((t) => t.status === "ongoing");
          setSelectedTripId(ongoing?.id || items[0].id);
        }
      } catch (err: any) {
        console.error("Load trips error", err);
        toast({
          title: "Gagal Memuat Trip",
          description: err?.message || "Tidak bisa memuat daftar trip.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingTrips(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ambil template saat trip berubah
  useEffect(() => {
    if (!selectedTripId) {
      setTemplates([]);
      return;
    }

    let mounted = true;
    setLoadingTemplates(true);

    (async () => {
      try {
        const url = new URL("/api/whatsapp-templates", window.location.origin);
        url.searchParams.set("tripId", selectedTripId);

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal memuat template WA");
        }

        setTemplates(json.items || []);

        // reset tab ke SCHEDULE setiap ganti trip
        setActiveType("SCHEDULE");
      } catch (err: any) {
        console.error("Load templates error", err);
        toast({
          title: "Gagal Memuat Template",
          description: err?.message || "Tidak bisa memuat template WhatsApp.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingTemplates(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedTripId, toast]);

  const handleChangeTemplateContent = (type: TemplateType, value: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.type === type
          ? {
              ...t,
              content: value,
            }
          : t
      )
    );
  };

  const handleResetToDefault = (type: TemplateType) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.type === type
          ? {
              ...t,
              content: t.defaultContent,
            }
          : t
      )
    );
  };

  const handleSave = async () => {
    if (!selectedTripId) {
      toast({
        title: "Pilih Trip",
        description: "Silakan pilih trip terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/whatsapp-templates", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          templates: templates.map((t) => ({
            type: t.type,
            name: t.name,
            content:
              t.content && t.content.length > 0 ? t.content : t.defaultContent,
          })),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal menyimpan template WhatsApp.");
      }

      toast({
        title: "Template Disimpan",
        description: "Template WhatsApp berhasil disimpan untuk trip ini.",
      });
    } catch (err: any) {
      console.error("Save templates error", err);
      toast({
        title: "Gagal Menyimpan",
        description:
          err?.message || "Terjadi kesalahan saat menyimpan template.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const activeTemplate = templates.find((t) => t.type === activeType);
  const activePreview = buildPreview(activeType, activeTemplate);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Template Pesan WhatsApp</CardTitle>
        <CardDescription>
          Atur teks pesan WhatsApp untuk kirim jadwal, peserta didaftarkan, dan
          pengumuman. Template disimpan per trip dan bisa memakai placeholder
          dinamis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Hint umum cara pakai template */}
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-800">
            Cara menggunakan template:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Gunakan{" "}
              <code className="px-1 rounded bg-white border">
                {"{{nama_placeholder}}"}
              </code>{" "}
              untuk menyisipkan data otomatis (nama peserta, nama trip, dll).
            </li>
            <li>
              Contoh:{" "}
              <code className="px-1 rounded bg-white border">
                Halo {`{{participant_name}}`}!
              </code>{" "}
              akan diganti menjadi{" "}
              <span className="italic">&quot;Halo Budi!&quot;</span>.
            </li>
            <li>
              Placeholder yang tersedia berbeda untuk setiap jenis template
              (lihat di bawah tab).
            </li>
          </ul>
        </div>

        {/* Pilih Trip */}
        <div className="space-y-2">
          <Label>Pilih Trip</Label>
          <Select
            value={selectedTripId}
            onValueChange={setSelectedTripId}
            disabled={loadingTrips}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  loadingTrips ? "Memuat daftar trip..." : "Pilih trip..."
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
                      {trip.status === "ongoing" ? "Aktif" : "Selesai"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs template */}
        {selectedTripId ? (
          <div className="flex-1 flex flex-col gap-3 min-h-[320px]">
            {loadingTemplates ? (
              <p className="text-sm text-slate-500">
                Memuat template WhatsApp...
              </p>
            ) : (
              <Tabs
                value={activeType}
                onValueChange={(v) => setActiveType(v as TemplateType)}
                className="flex-1 flex flex-col gap-3"
              >
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                  <TabsTrigger value="SCHEDULE" className="text-xs">
                    Jadwal Trip
                  </TabsTrigger>
                  <TabsTrigger
                    value="PARTICIPANT_REGISTERED_NEW"
                    className="text-xs"
                  >
                    Peserta Baru
                  </TabsTrigger>
                  <TabsTrigger
                    value="PARTICIPANT_REGISTERED_EXISTING"
                    className="text-xs"
                  >
                    Peserta Sudah Ada
                  </TabsTrigger>
                  <TabsTrigger value="ANNOUNCEMENT" className="text-xs">
                    Pengumuman
                  </TabsTrigger>
                </TabsList>

                {(Object.keys(TYPE_LABEL) as TemplateType[]).map((type) => {
                  const tpl = templates.find((t) => t.type === type);
                  const content = tpl?.content || tpl?.defaultContent || "";
                  const preview = buildPreview(type, tpl);

                  return (
                    <TabsContent
                      key={type}
                      value={type}
                      className="mt-2 flex-1 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {TYPE_LABEL[type]}
                          </p>
                          <p className="text-xs text-slate-500">
                            {TYPE_DESC[type]}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent text-xs"
                          onClick={() => handleResetToDefault(type)}
                        >
                          Reset Default
                        </Button>
                      </div>

                      {/* Warning: placeholder tidak boleh diubah */}
                      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p className="font-semibold">Penting:</p>
                        <p>
                          Placeholder seperti{" "}
                          <code className="bg-white border px-1 rounded">
                            {`{{participant_name}}`}
                          </code>{" "}
                          <span className="font-medium">
                            tidak boleh diubah namanya
                          </span>
                          . Anda boleh memindahkan atau menghapus placeholder,
                          tetapi jangan mengganti teks di dalam{" "}
                          <code className="bg-white border mx-1 px-1 rounded">
                            {"{{ ... }}"}
                          </code>
                          .
                        </p>
                      </div>

                      {/* Placeholder list */}
                      <div className="rounded-md border bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-700 mb-1">
                          Placeholder yang bisa digunakan:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {TYPE_PLACEHOLDERS[type].map((ph) => (
                            <span
                              key={ph}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-300 font-mono"
                            >
                              {ph}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Textarea template */}
                        <Textarea
                          value={content}
                          onChange={(e) =>
                            handleChangeTemplateContent(type, e.target.value)
                          }
                          className="min-h-[160px] flex-1 text-sm font-mono"
                          spellCheck={false}
                        />

                        {/* Preview pesan */}
                        <div className="rounded-md border bg-white px-3 py-2">
                          <p className="text-xs font-semibold text-slate-700 mb-1">
                            Preview pesan (contoh hasil di WhatsApp):
                          </p>
                          <div className="text-xs whitespace-pre-wrap font-mono text-slate-800">
                            {preview || (
                              <span className="text-slate-400">
                                Template kosong. Isi template di atas untuk
                                melihat preview.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Pilih trip terlebih dahulu untuk mengatur template WhatsApp.
          </p>
        )}

        {/* Save */}
        <div className="pt-1">
          <Button
            onClick={handleSave}
            disabled={saving || !selectedTripId || loadingTemplates}
          >
            {saving ? "Menyimpan..." : "Simpan Template"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
