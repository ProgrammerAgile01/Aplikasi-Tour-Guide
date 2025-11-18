"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function GeoRadiusSettingsCard() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [geoReminderRadius, setGeoReminderRadius] = useState<number | "">("");
  const [geoAttendanceRadius, setGeoAttendanceRadius] = useState<number | "">(
    ""
  );

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/geo-radius")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Gagal memuat pengaturan radius");
        }

        const data = json.data;
        setGeoReminderRadius(data.geoReminderRadiusMeters ?? 1000);
        setGeoAttendanceRadius(data.geoAttendanceRadiusMeters ?? 200);
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Gagal memuat pengaturan radius",
          description: err?.message ?? "Terjadi kesalahan saat memuat data",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/geo-radius", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geoReminderRadiusMeters:
            typeof geoReminderRadius === "number"
              ? geoReminderRadius
              : Number(geoReminderRadius) || undefined,
          geoAttendanceRadiusMeters:
            typeof geoAttendanceRadius === "number"
              ? geoAttendanceRadius
              : Number(geoAttendanceRadius) || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Gagal menyimpan pengaturan radius");
      }

      toast({
        title: "Berhasil disimpan",
        description: "Pengaturan radius global berhasil diperbarui.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal menyimpan",
        description: err?.message ?? "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Radius Lokasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Radius ini berlaku untuk semua trip. Jarak dihitung dari titik lokasi
          jadwal ke posisi peserta (GPS).
        </p>

        <div className="space-y-2">
          <Label htmlFor="geoReminderRadius">
            Radius Reminder Agenda (meter)
          </Label>
          <Input
            id="geoReminderRadius"
            type="number"
            min={1}
            disabled={loading || saving}
            value={geoReminderRadius}
            onChange={(e) =>
              setGeoReminderRadius(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Contoh: 1000 = pengingat (notif + suara) muncul kalau peserta sudah
            &lt; 1 km dari lokasi agenda.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="geoAttendanceRadius">
            Radius Absensi Check-in (meter)
          </Label>
          <Input
            id="geoAttendanceRadius"
            type="number"
            min={1}
            disabled={loading || saving}
            value={geoAttendanceRadius}
            onChange={(e) =>
              setGeoAttendanceRadius(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Contoh: 200 = peserta hanya bisa check-in kalau berada &lt; 200 m
            dari titik lokasi jadwal.
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </CardContent>
    </Card>
  );
}
