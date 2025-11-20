"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AttendanceWindowSettingsCard() {
  const { toast } = useToast();
  const [grace, setGrace] = useState("15");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/attendance-window");
        const json = await res.json();

        if (!res.ok || !json.ok) throw new Error(json?.message);
        setGrace(String(json.data.grace ?? 15));
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Gagal memuat",
          description: err?.message ?? "Tidak dapat memuat pengaturan",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/attendance-window", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grace }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.message);

      toast({
        title: "Berhasil",
        description: "Pengaturan toleransi absen diperbarui",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: err?.message ?? "Terjadi kesalahan",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toleransi Absensi</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="grace">Toleransi absen (menit)</Label>
              <Input
                id="grace"
                type="number"
                min={0}
                max={120}
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Contoh: input 15 — berarti 15 menit sebelum & sesudah jam sesi
                masih boleh absen
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
