// "use client";

// import type React from "react";
// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import {
//   Home,
//   Calendar,
//   Battery as Gallery,
//   Star,
//   LogOut,
//   Map,
// } from "lucide-react";
// import { useAuth } from "@/lib/auth";
// import { Button } from "@/components/ui/button";

// export default function TripLayout({
//   children,
//   params,
// }: {
//   children: React.ReactNode;
//   params: { tripId: string };
// }) {
//   const pathname = usePathname();
//   const { user, logout } = useAuth();

//   const tripId = params.tripId;

//   const navItems = [
//     { name: "Beranda", path: `/trip/${tripId}/overview`, icon: Home },
//     { name: "Jadwal", path: `/trip/${tripId}/schedule`, icon: Calendar },
//     { name: "Peta", path: `/trip/${tripId}/map`, icon: Map },
//     { name: "Galeri", path: `/trip/${tripId}/gallery`, icon: Gallery },
//     { name: "Umpan Balik", path: `/trip/${tripId}/feedback`, icon: Star },
//   ];

//   return (
//     <div className="min-h-screen bg-background flex flex-col">
//       {/* Header dengan user info dan logout */}
//       <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
//         <div>
//           <p className="text-xs text-muted-foreground">Selamat datang,</p>
//           <p className="font-semibold text-sm">{user?.name}</p>
//         </div>
//         <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
//           <LogOut size={16} />
//           <span className="hidden sm:inline">Keluar</span>
//         </Button>
//       </header>

//       <main className="flex-1 pb-20 overflow-y-auto bg-background">
//         {children}
//       </main>

//       <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex gap-0 shadow-lg z-50">
//         {navItems.map((item) => {
//           const Icon = item.icon;
//           const isActive = pathname === item.path;
//           return (
//             <Link
//               key={item.path}
//               href={item.path}
//               className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
//                 isActive
//                   ? "text-primary bg-primary/5"
//                   : "text-muted-foreground hover:text-foreground"
//               }`}
//             >
//               <Icon size={24} />
//               <span className="text-xs mt-1 font-medium text-center">
//                 {item.name}
//               </span>
//             </Link>
//           );
//         })}
//       </nav>
//     </div>
//   );
// }

import React from "react";
import ClientHeader from "./_client-header";
import ClientBottomNav from "./_bottom-nav";

// Server Layout (opsi 1): params adalah Promise → harus di-unwrap
export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const navItems = [
    { name: "Beranda", path: `/trip/${tripId}/overview`, icon: "home" },
    { name: "Jadwal", path: `/trip/${tripId}/schedule`, icon: "calendar" },
    { name: "Peta", path: `/trip/${tripId}/map`, icon: "map" },
    { name: "Galeri", path: `/trip/${tripId}/gallery`, icon: "gallery" },
    { name: "Ulasan", path: `/trip/${tripId}/feedback`, icon: "star" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header (client) dengan info user & tombol logout */}
      <ClientHeader />

      {/* Konten halaman */}
      <main className="flex-1 pb-20 overflow-y-auto bg-background">
        {children}
      </main>

      {/* Bottom nav (client) dengan active state berdasarkan pathname */}
      <ClientBottomNav items={navItems as any} />
    </div>
  );
}
