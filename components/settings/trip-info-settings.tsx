// "use client";

// import { useEffect, useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { toast } from "@/hooks/use-toast";
// import { ImageIcon, RefreshCw, Settings2, FileText, Type } from "lucide-react";

// type SettingsApiResponse = {
//   ok: boolean;
//   message?: string;
//   data?: {
//     logoUrl: string | null;
//     tripName: string;
//     description: string;
//   };
// };

// export function GlobalSettingsCard() {
//   const [tripName, setTripName] = useState("");
//   const [description, setDescription] = useState("");
//   const [logoUrl, setLogoUrl] = useState<string | null>(null); // path tersimpan di public
//   const [logoFile, setLogoFile] = useState<File | null>(null);

//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const loadSettings = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch("/api/settings", { cache: "no-store" });
//       const json: SettingsApiResponse = await res.json();

//       if (!res.ok || !json.ok || !json.data) {
//         throw new Error(json.message || "Gagal memuat setting");
//       }

//       setTripName(json.data.tripName || "");
//       setDescription(json.data.description || "");
//       setLogoUrl(json.data.logoUrl ?? null);
//       setLogoFile(null);
//     } catch (err: any) {
//       toast({
//         title: "Gagal memuat pengaturan",
//         description: err?.message || "Terjadi kesalahan saat memuat data.",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadSettings();
//   }, []);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     try {
//       setSaving(true);
//       const formData = new FormData();
//       formData.set("tripName", tripName);
//       formData.set("description", description);
//       if (logoFile) {
//         formData.set("logo", logoFile);
//       }

//       const res = await fetch("/api/settings", {
//         method: "POST",
//         body: formData,
//       });

//       const json: SettingsApiResponse = await res.json();

//       if (!res.ok || !json.ok || !json.data) {
//         throw new Error(json.message || "Gagal menyimpan pengaturan");
//       }

//       setTripName(json.data.tripName);
//       setDescription(json.data.description);
//       setLogoUrl(json.data.logoUrl ?? null);
//       setLogoFile(null);

//       toast({
//         title: "Pengaturan disimpan",
//         description: "Setting aplikasi tour guide berhasil diperbarui.",
//       });
//     } catch (err: any) {
//       toast({
//         title: "Gagal menyimpan",
//         description: err?.message || "Terjadi kesalahan saat menyimpan.",
//         variant: "destructive",
//       });
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Settings2 className="w-5 h-5 text-slate-700" />
//           Setting Tampilan Umum
//         </CardTitle>
//       </CardHeader>

//       <CardContent>
//         {loading ? (
//           <div className="flex items-center gap-2 text-sm text-slate-600">
//             <RefreshCw className="w-4 h-4 animate-spin" />
//             Memuat pengaturan...
//           </div>
//         ) : (
//           <form onSubmit={handleSubmit} className="space-y-5">
//             {/* Logo image */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium flex items-center gap-2">
//                 <ImageIcon className="w-4 h-4 text-slate-600" />
//                 Logo Aplikasi
//               </label>
//               <Input
//                 type="file"
//                 accept="image/*"
//                 onChange={(e) => {
//                   const file = e.target.files?.[0] ?? null;
//                   setLogoFile(file);
//                 }}
//               />
//               <p className="text-xs text-slate-500">
//                 Format PNG/JPG/WEBP.
//               </p>
//             </div>

//             {/* Nama trip */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium flex items-center gap-2">
//                 <Type className="w-4 h-4 text-slate-600" />
//                 Nama Trip
//               </label>
//               <Input
//                 placeholder="Masukkan nama trip disini"
//                 value={tripName}
//                 onChange={(e) => setTripName(e.target.value)}
//               />
//             </div>

//             {/* Deskripsi */}
//             <div className="space-y-2">
//               <label className="text-sm font-medium flex items-center gap-2">
//                 <FileText className="w-4 h-4 text-slate-600" />
//                 Deskripsi Trip
//               </label>
//               <Textarea
//                 rows={5}
//                 placeholder="Masukkan deskripsi trip disini"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//               />
//             </div>

//             <div className="flex items-center justify-end pt-2">
//               <Button type="submit" disabled={saving}>
//                 {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
//                 Simpan Pengaturan
//               </Button>
//             </div>
//           </form>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ImageIcon, RefreshCw, Settings2, FileText, Type } from "lucide-react";

type SettingsApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    logoUrl: string | null;
    tripName: string;
    description: string;
  };
};

export function GlobalSettingsCard() {
  const [tripName, setTripName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null); // path tersimpan di public dari API
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // untuk preview file baru

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json: SettingsApiResponse = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Gagal memuat setting");
      }

      setTripName(json.data.tripName || "");
      setDescription(json.data.description || "");
      setLogoUrl(json.data.logoUrl ?? null);
      setLogoFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast({
        title: "Gagal memuat pengaturan",
        description: err?.message || "Terjadi kesalahan saat memuat data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // generate / cleanup URL preview ketika pilih file baru
  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(logoFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [logoFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const formData = new FormData();
      formData.set("tripName", tripName);
      formData.set("description", description);
      if (logoFile) {
        formData.set("logo", logoFile);
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      const json: SettingsApiResponse = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Gagal menyimpan pengaturan");
      }

      setTripName(json.data.tripName);
      setDescription(json.data.description);
      setLogoUrl(json.data.logoUrl ?? null);
      setLogoFile(null);
      setPreviewUrl(null);

      toast({
        title: "Pengaturan disimpan",
        description: "Setting aplikasi tour guide berhasil diperbarui.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal menyimpan",
        description: err?.message || "Terjadi kesalahan saat menyimpan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // path yang dipakai untuk ditampilkan di <img>:
  const effectiveLogoSrc = previewUrl || logoUrl || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-slate-700" />
          Setting Tampilan Umum
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Memuat pengaturan...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo image */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                Logo Aplikasi
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setLogoFile(file);
                }}
              />
              <p className="text-xs text-slate-500">
                Format PNG/JPG/WEBP
              </p>

              {/* Preview logo */}
              <div className="mt-2">
                {effectiveLogoSrc ? (
                  <div className="inline-flex items-center gap-3">
                    <div className="h-16 w-16 rounded-md border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effectiveLogoSrc}
                        alt="Logo aplikasi"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      {previewUrl ? (
                        <span>Preview logo baru (belum disimpan)</span>
                      ) : (
                        <span>Logo yang sedang digunakan aplikasi</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Belum ada logo tersimpan. Pilih gambar untuk mengatur logo
                  </p>
                )}
              </div>
            </div>

            {/* Nama trip */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4 text-slate-600" />
                Nama Trip
              </label>
              <Input
                placeholder="Masukkan nama trip disini"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Deskripsi Trip
              </label>
              <Textarea
                rows={5}
                placeholder="Masukkan deskripsi trip disini"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Pengaturan
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
