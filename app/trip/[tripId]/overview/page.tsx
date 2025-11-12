// "use client"

// import { useState, useEffect } from "react"
// import { MapPin, CheckCircle, Users, Clock, Bell, MessageCircle, Award, BookOpen, MessageSquare } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Card } from "@/components/ui/card"
// import { useToast } from "@/hooks/use-toast"
// import { useRouter } from "next/navigation"
// import { useGeoReminder } from "@/hooks/use-geo-reminder"
// import Link from "next/link"

// export default function OverviewPage({
//   params,
// }: {
//   params: { tripId: string }
// }) {
//   const { toast } = useToast()
//   const router = useRouter()
//   const [checkInStatus, setCheckInStatus] = useState<{
//     checkedIn: boolean
//     method?: string
//     timestamp?: string
//   }>({ checkedIn: false })

//   // Mock data
//   const tripData = {
//     title: "Paket Tour Komodo 3 Hari 2 Malam",
//     subtitle: "Sailing Trip Eksklusif Nusa Tenggara Timur",
//     isConnected: true,
//     nextAgenda: {
//       id: "1-1",
//       title: "Penjemputan Bandara Komodo Airport",
//       time: "13.00",
//       date: "27 November 2025",
//       location: { lat: "-8.7242", lng: "120.6529" },
//     },
//     todaysSummary: {
//       sessions: 4,
//       completed: 1,
//       participants: 15,
//       duration: "8 jam",
//     },
//     announcements: [
//       { id: 1, text: "Jadwal makan malam dimajukan ke pukul 18.00." },
//       { id: 2, text: "Mohon gunakan alas kaki anti-slip saat di dek kapal." },
//       { id: 3, text: "Pengambilan foto grup pada pukul 16.30 di dek utama." },
//     ],
//   }

//   useGeoReminder(tripData.nextAgenda, true)

//   useEffect(() => {
//     const sessionId = tripData.nextAgenda.id
//     const storedStatus = localStorage.getItem(`checkin-${params.tripId}-${sessionId}`)
//     if (storedStatus) {
//       const parsed = JSON.parse(storedStatus)
//       setCheckInStatus({
//         checkedIn: true,
//         method: parsed.method,
//         timestamp: parsed.checkedInAt,
//       })
//     }
//   }, [params.tripId])

//   const handleViewLocation = () => {
//     const url = `https://www.google.com/maps/search/?api=1&query=${tripData.nextAgenda.location.lat},${tripData.nextAgenda.location.lng}`
//     window.open(url, "_blank")
//     toast({
//       description: "Membuka Google Maps...",
//     })
//   }

//   const handleEnableWhatsApp = () => {
//     router.push(`/trip/${params.tripId}/wa/subscribe`)
//   }

//   return (
//     <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
//       {/* Header dengan Status */}
//       <div className="space-y-3">
//         <div className="flex items-start justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-foreground">{tripData.title}</h1>
//             <p className="text-sm text-muted-foreground mt-1">{tripData.subtitle}</p>
//           </div>
//           <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
//             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//             <span className="text-xs font-medium text-green-700">Terhubung</span>
//           </div>
//         </div>
//       </div>

//       {/* Agenda Berikutnya */}
//       <Card className="p-4 border border-border">
//         <div className="space-y-4">
//           <h2 className="text-sm font-semibold text-foreground">Agenda Berikutnya</h2>
//           <div className="space-y-3">
//             <div>
//               <p className="font-medium text-foreground">{tripData.nextAgenda.title}</p>
//               <p className="text-sm text-muted-foreground mt-1">
//                 Pukul {tripData.nextAgenda.time} • {tripData.nextAgenda.date}
//               </p>
//               {checkInStatus.checkedIn && (
//                 <div className="mt-2 inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
//                   <CheckCircle size={14} className="text-green-600" />
//                   <span className="text-xs font-medium text-green-700">
//                     Check-in berhasil • {checkInStatus.timestamp}
//                   </span>
//                 </div>
//               )}
//             </div>
//             <div className="flex gap-2">
//               <Button onClick={handleViewLocation} variant="outline" className="flex-1 gap-2 text-sm bg-transparent">
//                 <MapPin size={16} />
//                 Lihat Lokasi
//               </Button>
//               {checkInStatus.checkedIn ? (
//                 <Button
//                   disabled
//                   className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <CheckCircle size={16} />
//                   Sudah Check-in
//                 </Button>
//               ) : (
//                 <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm">
//                   <Link href={`/trip/${params.tripId}/session/${tripData.nextAgenda.id}/checkin`}>
//                     <CheckCircle size={16} />
//                     Konfirmasi Kehadiran
//                   </Link>
//                 </Button>
//               )}
//             </div>
//           </div>
//         </div>
//       </Card>

//       {/* Ringkasan Hari Ini */}
//       <div className="space-y-3">
//         <h2 className="text-sm font-semibold text-foreground">Ringkasan Hari Ini</h2>
//         <div className="grid grid-cols-2 gap-3">
//           <Card className="p-4 border border-border">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-blue-50 rounded-lg">
//                 <Bell size={20} className="text-primary" />
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">Jumlah Sesi</p>
//                 <p className="text-lg font-bold text-foreground">{tripData.todaysSummary.sessions}</p>
//               </div>
//             </div>
//           </Card>

//           <Card className="p-4 border border-border">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-green-50 rounded-lg">
//                 <CheckCircle size={20} className="text-green-600" />
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">Selesai</p>
//                 <p className="text-lg font-bold text-foreground">{tripData.todaysSummary.completed}</p>
//               </div>
//             </div>
//           </Card>

//           <Card className="p-4 border border-border">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-purple-50 rounded-lg">
//                 <Users size={20} className="text-purple-600" />
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">Peserta</p>
//                 <p className="text-lg font-bold text-foreground">{tripData.todaysSummary.participants}</p>
//               </div>
//             </div>
//           </Card>

//           <Card className="p-4 border border-border">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-orange-50 rounded-lg">
//                 <Clock size={20} className="text-orange-600" />
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">Durasi</p>
//                 <p className="text-lg font-bold text-foreground">{tripData.todaysSummary.duration}</p>
//               </div>
//             </div>
//           </Card>
//         </div>
//       </div>

//       {/* Quick Access Features */}
//       <div className="space-y-3">
//         <h2 className="text-sm font-semibold text-foreground">Fitur Eksklusif</h2>
//         <div className="grid grid-cols-3 gap-2">
//           <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-4 bg-transparent">
//             <Link href={`/trip/${params.tripId}/badges`}>
//               <Award size={24} className="text-primary" />
//               <span className="text-xs">Badges</span>
//             </Link>
//           </Button>
//           <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-4 bg-transparent">
//             <Link href={`/trip/${params.tripId}/story`}>
//               <BookOpen size={24} className="text-primary" />
//               <span className="text-xs">Story</span>
//             </Link>
//           </Button>
//           <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-4 bg-transparent">
//             <Link href={`/trip/${params.tripId}/chat`}>
//               <MessageSquare size={24} className="text-primary" />
//               <span className="text-xs">AI Chat</span>
//             </Link>
//           </Button>
//         </div>
//       </div>

//       {/* Pengumuman Terbaru */}
//       <div className="space-y-3">
//         <h2 className="text-sm font-semibold text-foreground">Pengumuman Terbaru</h2>
//         <div className="space-y-2">
//           {tripData.announcements.map((announcement) => (
//             <Card key={announcement.id} className="p-3 border border-border">
//               <p className="text-sm text-foreground leading-relaxed">{announcement.text}</p>
//             </Card>
//           ))}
//         </div>
//       </div>

//       {/* Banner WhatsApp */}
//       <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
//         <div className="flex items-start gap-3">
//           <div className="p-2 bg-primary/20 rounded-lg">
//             <MessageCircle size={20} className="text-primary" />
//           </div>
//           <div className="flex-1">
//             <h3 className="font-semibold text-foreground">Aktifkan Pengingat WhatsApp</h3>
//             <p className="text-xs text-muted-foreground mt-1">
//               Dapatkan notifikasi real-time untuk setiap agenda dan pengumuman penting.
//             </p>
//             <Button
//               onClick={handleEnableWhatsApp}
//               className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
//             >
//               Aktifkan Sekarang
//             </Button>
//           </div>
//         </div>
//       </Card>
//     </div>
//   )
// }

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  CheckCircle,
  Users,
  Clock,
  Bell,
  MessageCircle,
  Award,
  BookOpen,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { useGeoReminder } from "@/hooks/use-geo-reminder";
import Link from "next/link";

type OverviewData = {
  id: string;
  title: string;
  subtitle?: string;
  nextAgenda?: {
    id: string;
    title: string;
    time: string;
    date: string;
    location?: { lat: string | number; lng: string | number };
  };
  todaysSummary?: {
    sessions: number;
    completed: number;
    participants: number;
    duration: string;
  };
  announcements?: { id: string | number; text: string }[];
};

export default function OverviewPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId as string;

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkInStatus, setCheckInStatus] = useState<{
    checkedIn: boolean;
    method?: string;
    timestamp?: string;
  }>({ checkedIn: false });

  // fetch real data
  useEffect(() => {
    if (!tripId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/trips/${encodeURIComponent(tripId)}/overview`,
          {
            cache: "no-store",
            credentials: "same-origin",
          }
        );
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "Gagal memuat data trip");
        setData(json.data as OverviewData);
      } catch (err: any) {
        toast({
          title: "Gagal memuat",
          description: err?.message || "Terjadi kesalahan saat memuat data",
          variant: "destructive",
        });
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId, toast]);

  // pakai geo reminder saat data nextAgenda tersedia
  useGeoReminder(data?.nextAgenda, true);

  // restore check-in status (localStorage)
  useEffect(() => {
    if (!tripId || !data?.nextAgenda?.id) return;
    const sessionId = data.nextAgenda.id;
    const storedStatus = localStorage.getItem(`checkin-${tripId}-${sessionId}`);
    if (storedStatus) {
      const parsed = JSON.parse(storedStatus);
      setCheckInStatus({
        checkedIn: true,
        method: parsed.method,
        timestamp: parsed.checkedInAt,
      });
    } else {
      setCheckInStatus({ checkedIn: false });
    }
  }, [tripId, data?.nextAgenda?.id]);

  const handleViewLocation = () => {
    const loc = data?.nextAgenda?.location;
    if (!loc) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    window.open(url, "_blank");
    toast({ description: "Membuka Google Maps..." });
  };

  const handleEnableWhatsApp = () => {
    if (!tripId) return;
    router.push(`/trip/${tripId}/wa/subscribe`);
  };

  // fallback agar UI tetap ter-render rapi walau data null
  const title = data?.title ?? "—";
  const subtitle = data?.subtitle ?? "—";
  const nextAgenda = data?.nextAgenda;
  const summary = data?.todaysSummary;
  const announcements = data?.announcements ?? [];

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Memuat data trip...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header dengan Status - UI sama */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-green-700">
              Terhubung
            </span>
          </div>
        </div>
      </div>

      {/* Agenda Berikutnya - UI sama */}
      {nextAgenda && (
        <Card className="p-4 border border-border">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Agenda Berikutnya
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">
                  {nextAgenda.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pukul {nextAgenda.time} • {nextAgenda.date}
                </p>
                {checkInStatus.checkedIn && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-700">
                      Check-in berhasil • {checkInStatus.timestamp}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleViewLocation}
                  variant="outline"
                  className="flex-1 gap-2 text-sm bg-transparent"
                  disabled={!nextAgenda.location}
                >
                  <MapPin size={16} />
                  Lihat Lokasi
                </Button>
                {checkInStatus.checkedIn ? (
                  <Button
                    disabled
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    Sudah Check-in
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-sm"
                  >
                    <Link
                      href={`/trip/${tripId}/session/${nextAgenda.id}/checkin`}
                    >
                      <CheckCircle size={16} />
                      Konfirmasi Kehadiran
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Ringkasan Hari Ini - UI sama */}
      {summary && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Ringkasan Hari Ini
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Bell size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Sesi</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.sessions}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Selesai</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.completed}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peserta</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.participants}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Clock size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durasi</p>
                  <p className="text-lg font-bold text-foreground">
                    {summary.duration}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Quick Access Features - UI sama */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Fitur Eksklusif
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-transparent"
          >
            <Link href={`/trip/${tripId}/badges`}>
              <Award size={24} className="text-primary" />
              <span className="text-xs">Badges</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-transparent"
          >
            <Link href={`/trip/${tripId}/story`}>
              <BookOpen size={24} className="text-primary" />
              <span className="text-xs">Story</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex flex-col gap-2 h-auto py-4 bg-transparent"
          >
            <Link href={`/trip/${tripId}/chat`}>
              <MessageSquare size={24} className="text-primary" />
              <span className="text-xs">AI Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pengumuman Terbaru - UI sama */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Pengumuman Terbaru
          </h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id} className="p-3 border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  {a.text}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Banner WhatsApp - UI sama */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <MessageCircle size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              Aktifkan Pengingat WhatsApp
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Dapatkan notifikasi real-time untuk setiap agenda dan pengumuman
              penting.
            </p>
            <Button
              onClick={handleEnableWhatsApp}
              className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              Aktifkan Sekarang
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
