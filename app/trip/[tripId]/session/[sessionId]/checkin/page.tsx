// // "use client"

// // import { useRouter } from "next/navigation"
// // import { Button } from "@/components/ui/button"
// // import { Card } from "@/components/ui/card"
// // import { ArrowLeft, MapPin, Smartphone } from "lucide-react"
// // import { useToast } from "@/hooks/use-toast"
// // import { useState } from "react"

// // export default function CheckinPage({
// //   params,
// // }: {
// //   params: { tripId: string; sessionId: string }
// // }) {
// //   const router = useRouter()
// //   const { toast } = useToast()
// //   const [isCheckingLocation, setIsCheckingLocation] = useState(false)

// //   const handleGeoCheckIn = async () => {
// //     setIsCheckingLocation(true)

// //     // Show loading toast
// //     toast({
// //       description: "Mengecek lokasi Anda…",
// //     })

// //     // Check geolocation permission
// //     if (!navigator.geolocation) {
// //       setIsCheckingLocation(false)
// //       toast({
// //         title: "Error",
// //         description: "Geolocation tidak didukung di browser Anda.",
// //         variant: "destructive",
// //       })
// //       return
// //     }

// //     navigator.geolocation.getCurrentPosition(
// //       (position) => {
// //         // Mock: Always success
// //         const now = new Date()
// //         const checkinTime = now.toLocaleTimeString("id-ID", {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         })

// //         // Save to localStorage for persistence
// //         const checkinData = {
// //           sessionId: params.sessionId,
// //           checkedInAt: checkinTime,
// //           method: "geo",
// //           timestamp: now.getTime(),
// //         }
// //         localStorage.setItem(`checkin-${params.tripId}-${params.sessionId}`, JSON.stringify(checkinData))

// //         setIsCheckingLocation(false)
// //         toast({
// //           title: "Berhasil!",
// //           description: "Kehadiran Anda telah dikonfirmasi.",
// //         })

// //         // Redirect back to session detail
// //         setTimeout(() => {
// //           router.push(`/trip/${params.tripId}/session/${params.sessionId}`)
// //         }, 1000)
// //       },
// //       (error) => {
// //         setIsCheckingLocation(false)
// //         toast({
// //           title: "Gagal",
// //           description: "Izin lokasi ditolak. Aktifkan lokasi dan coba lagi.",
// //           variant: "destructive",
// //         })
// //       },
// //     )
// //   }

// //   const handleGoToQRScan = () => {
// //     router.push(`/trip/${params.tripId}/session/${params.sessionId}/scan`)
// //   }

// //   return (
// //     <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
// //       {/* Back Button */}
// //       <button
// //         onClick={() => router.back()}
// //         className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
// //       >
// //         <ArrowLeft size={20} />
// //         <span className="text-sm font-medium">Kembali</span>
// //       </button>

// //       {/* Header */}
// //       <div className="space-y-2">
// //         <h1 className="text-2xl font-bold text-foreground">Konfirmasi Kehadiran</h1>
// //         <p className="text-sm text-muted-foreground">Silakan pilih metode konfirmasi kehadiran Anda.</p>
// //       </div>

// //       {/* GEO Check Card - Primary Method */}
// //       <Card className="p-6 border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
// //         <div className="flex items-start gap-4">
// //           <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20">
// //             <MapPin size={24} className="text-primary" />
// //           </div>
// //           <div className="flex-1 space-y-1">
// //             <div className="flex items-center gap-2">
// //               <h2 className="font-semibold text-foreground text-lg">Check-in Lokasi</h2>
// //               <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">Disarankan</span>
// //             </div>
// //             <p className="text-sm text-muted-foreground">Sistem akan memeriksa lokasi Anda. Pastikan GPS aktif.</p>
// //           </div>
// //         </div>
// //         <Button
// //           onClick={handleGeoCheckIn}
// //           disabled={isCheckingLocation}
// //           className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-medium gap-2"
// //         >
// //           {isCheckingLocation ? "Sedang Memeriksa Lokasi..." : "Periksa Lokasi Saya"}
// //         </Button>
// //       </Card>

// //       {/* QR Scan Card - Manual Method */}
// //       <Card className="p-6 border border-border space-y-4 hover:border-primary/30 transition-colors">
// //         <div className="flex items-start gap-4">
// //           <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
// //             <Smartphone size={24} className="text-foreground" />
// //           </div>
// //           <div className="flex-1 space-y-1">
// //             <h2 className="font-semibold text-foreground text-lg">Scan QR</h2>
// //             <p className="text-sm text-muted-foreground">Pindai kode QR yang ditunjukkan oleh pemandu.</p>
// //           </div>
// //         </div>
// //         <Button
// //           onClick={handleGoToQRScan}
// //           variant="outline"
// //           className="w-full py-3 text-base font-medium border-primary/30 hover:bg-primary/5 bg-transparent"
// //         >
// //           Buka Kamera Scan QR
// //         </Button>
// //       </Card>

// //       {/* Help Text */}
// //       <div className="pt-4">
// //         <p className="text-xs text-muted-foreground text-center">
// //           Kesulitan check-in lokasi?{" "}
// //           <button
// //             onClick={handleGoToQRScan}
// //             className="text-primary hover:text-primary/80 font-medium transition-colors"
// //           >
// //             Scan QR
// //           </button>
// //         </p>
// //       </div>
// //     </div>
// //   )
// // }

// "use client";

// import { useRouter, useParams } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { ArrowLeft, MapPin, Smartphone } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { useState } from "react";

// export default function CheckinPage() {
//   const router = useRouter();
//   const { toast } = useToast();
//   const [isCheckingLocation, setIsCheckingLocation] = useState(false);

//   // ✅ ambil tripId & sessionId dari useParams (BUKAN dari props)
//   const params = useParams<{ tripId: string; sessionId: string }>();
//   const tripId = params?.tripId as string;
//   const sessionId = params?.sessionId as string;

//   const handleGeoCheckIn = async () => {
//     if (!tripId || !sessionId) return;

//     setIsCheckingLocation(true);

//     toast({
//       description: "Mengecek lokasi Anda…",
//     });

//     if (!navigator.geolocation) {
//       setIsCheckingLocation(false);
//       toast({
//         title: "Error",
//         description: "Geolocation tidak didukung di browser Anda.",
//         variant: "destructive",
//       });
//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       () => {
//         const now = new Date();
//         const checkinTime = now.toLocaleTimeString("id-ID", {
//           hour: "2-digit",
//           minute: "2-digit",
//         });

//         const checkinData = {
//           sessionId,
//           checkedInAt: checkinTime,
//           method: "geo",
//           timestamp: now.getTime(),
//         };

//         // ✅ key tetap sama, tapi pakai tripId/sessionId dari useParams
//         localStorage.setItem(
//           `checkin-${tripId}-${sessionId}`,
//           JSON.stringify(checkinData)
//         );

//         setIsCheckingLocation(false);
//         toast({
//           title: "Berhasil!",
//           description: "Kehadiran Anda telah dikonfirmasi.",
//         });

//         setTimeout(() => {
//           router.push(`/trip/${tripId}/session/${sessionId}`);
//         }, 1000);
//       },
//       () => {
//         setIsCheckingLocation(false);
//         toast({
//           title: "Gagal",
//           description: "Izin lokasi ditolak. Aktifkan lokasi dan coba lagi.",
//           variant: "destructive",
//         });
//       }
//     );
//   };

//   const handleGoToQRScan = () => {
//     if (!tripId || !sessionId) return;
//     router.push(`/trip/${tripId}/session/${sessionId}/scan`);
//   };

//   return (
//     <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
//       {/* Back Button */}
//       <button
//         onClick={() => router.back()}
//         className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
//       >
//         <ArrowLeft size={20} />
//         <span className="text-sm font-medium">Kembali</span>
//       </button>

//       {/* Header */}
//       <div className="space-y-2">
//         <h1 className="text-2xl font-bold text-foreground">
//           Konfirmasi Kehadiran
//         </h1>
//         <p className="text-sm text-muted-foreground">
//           Silakan pilih metode konfirmasi kehadiran Anda.
//         </p>
//       </div>

//       {/* GEO Check Card - Primary Method */}
//       <Card className="p-6 border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
//         <div className="flex items-start gap-4">
//           <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20">
//             <MapPin size={24} className="text-primary" />
//           </div>
//           <div className="flex-1 space-y-1">
//             <div className="flex items-center gap-2">
//               <h2 className="font-semibold text-foreground text-lg">
//                 Check-in Lokasi
//               </h2>
//               <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
//                 Disarankan
//               </span>
//             </div>
//             <p className="text-sm text-muted-foreground">
//               Sistem akan memeriksa lokasi Anda. Pastikan GPS aktif.
//             </p>
//           </div>
//         </div>
//         <Button
//           onClick={handleGeoCheckIn}
//           disabled={isCheckingLocation}
//           className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-medium gap-2"
//         >
//           {isCheckingLocation
//             ? "Sedang Memeriksa Lokasi..."
//             : "Periksa Lokasi Saya"}
//         </Button>
//       </Card>

//       {/* QR Scan Card - Manual Method */}
//       <Card className="p-6 border border-border space-y-4 hover:border-primary/30 transition-colors">
//         <div className="flex items-start gap-4">
//           <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
//             <Smartphone size={24} className="text-foreground" />
//           </div>
//           <div className="flex-1 space-y-1">
//             <h2 className="font-semibold text-foreground text-lg">Scan QR</h2>
//             <p className="text-sm text-muted-foreground">
//               Pindai kode QR yang ditunjukkan oleh pemandu.
//             </p>
//           </div>
//         </div>
//         <Button
//           onClick={handleGoToQRScan}
//           variant="outline"
//           className="w-full py-3 text-base font-medium border-primary/30 hover:bg-primary/5 bg-transparent"
//         >
//           Buka Kamera Scan QR
//         </Button>
//       </Card>

//       {/* Help Text */}
//       <div className="pt-4">
//         <p className="text-xs text-muted-foreground text-center">
//           Kesulitan check-in lokasi?{" "}
//           <button
//             onClick={handleGoToQRScan}
//             className="text-primary hover:text-primary/80 font-medium transition-colors"
//           >
//             Scan QR
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// }
"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-client";

export default function CheckinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const { user } = useAuth();

  // ambil tripId & sessionId dari URL
  const params = useParams<{ tripId: string; sessionId: string }>();
  const tripId = params?.tripId as string;
  const sessionId = params?.sessionId as string;

  const handleGeoCheckIn = async () => {
    if (!tripId || !sessionId || !user?.id) return;

    setIsCheckingLocation(true);

    toast({ description: "Mengecek lokasi Anda…" });

    if (!navigator.geolocation) {
      setIsCheckingLocation(false);
      toast({
        title: "Error",
        description: "Geolocation tidak didukung di browser Anda.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const res = await fetch("/api/checkins/geo/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripId, sessionId, lat, lon }),
          });

          const data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error(data?.message || "Gagal check-in lokasi");
          }

          const now = new Date();
          const checkinTime = now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const checkinData = {
            sessionId,
            checkedInAt: checkinTime,
            method: "geo",
            timestamp: now.getTime(),
          };

          // key per user, bukan per device saja
          const key = `checkin-${tripId}-${sessionId}-${user.id}`;
          localStorage.setItem(key, JSON.stringify(checkinData));

          setIsCheckingLocation(false);
          toast({
            title: "Berhasil!",
            description: "Kehadiran Anda telah dikonfirmasi dengan lokasi.",
          });

          setTimeout(() => {
            router.push(`/trip/${tripId}/session/${sessionId}`);
          }, 1000);
        } catch (err: any) {
          setIsCheckingLocation(false);
          toast({
            title: "Gagal",
            description: err?.message ?? "Terjadi kesalahan saat check-in.",
            variant: "destructive",
          });
        }
      },
      (error) => {
        setIsCheckingLocation(false);

        let msg = "Terjadi kesalahan saat mengambil lokasi.";
        if (error.code === error.PERMISSION_DENIED) {
          msg =
            "Izin lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda lalu coba lagi.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg =
            "Lokasi tidak tersedia. Coba nyalakan GPS atau pindah ke area terbuka.";
        } else if (error.code === error.TIMEOUT) {
          msg =
            "Pengambilan lokasi terlalu lama. Coba lagi dan pastikan sinyal GPS bagus.";
        }

        toast({
          title: "Gagal",
          description: msg,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleGoToQRScan = () => {
    if (!tripId || !sessionId) return;
    router.push(`/trip/${tripId}/session/${sessionId}/scan`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Kembali</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Konfirmasi Kehadiran
        </h1>
        <p className="text-sm text-muted-foreground">
          Silakan pilih metode konfirmasi kehadiran Anda.
        </p>
      </div>

      {/* GEO Check Card - Primary Method */}
      <Card className="p-6 border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20">
            <MapPin size={24} className="text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground text-lg">
                Check-in Lokasi
              </h2>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                Disarankan
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistem akan memeriksa lokasi Anda. Pastikan GPS aktif.
            </p>
          </div>
        </div>
        <Button
          onClick={handleGeoCheckIn}
          disabled={isCheckingLocation}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-medium gap-2"
        >
          {isCheckingLocation
            ? "Sedang Memeriksa Lokasi..."
            : "Periksa Lokasi Saya"}
        </Button>
      </Card>

      {/* QR Scan Card - Manual Method */}
      <Card className="p-6 border border-border space-y-4 hover:border-primary/30 transition-colors">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
            <Smartphone size={24} className="text-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-semibold text-foreground text-lg">Scan QR</h2>
            <p className="text-sm text-muted-foreground">
              Pindai kode QR yang ditunjukkan oleh pemandu.
            </p>
          </div>
        </div>
        <Button
          onClick={handleGoToQRScan}
          variant="outline"
          className="w-full py-3 text-base font-medium border-primary/30 hover:bg-primary/5 bg-transparent"
        >
          Buka Kamera Scan QR
        </Button>
      </Card>

      {/* Help Text */}
      <div className="pt-4">
        <p className="text-xs text-muted-foreground text-center">
          Kesulitan check-in lokasi?{" "}
          <button
            onClick={handleGoToQRScan}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Scan QR
          </button>
        </p>
      </div>
    </div>
  );
}
