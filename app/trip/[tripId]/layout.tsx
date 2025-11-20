import React from "react";
import ClientHeader from "./_client-header";
import ClientBottomNav from "./_bottom-nav";

// Server Layout
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
      <ClientHeader tripId={tripId} />

      {/* Konten halaman */}
      <main className="flex-1 pb-20 overflow-y-auto bg-background">
        {children}
      </main>

      {/* Bottom nav (client) */}
      <ClientBottomNav items={navItems as any} />
    </div>
  );
}
