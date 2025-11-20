"use client";

import { LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-client";
import Link from "next/link";

export default function ClientHeader({ tripId }: { tripId: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">Selamat datang,</p>

        {/* Nama bisa diklik ke halaman profil */}
        <Link
          href={`/trip/${tripId}/profile`}
          className="font-semibold text-sm flex items-center gap-1 hover:underline"
        >
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span>{user?.name ?? "Pengguna"}</span>
        </Link>

        {/* Kalau mau eksplisit bisa tambahkan teks kecil */}
        {/* <p className="text-[11px] text-muted-foreground">Tap untuk lihat profil</p> */}
      </div>

      <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
        <LogOut size={16} />
        <span className="hidden sm:inline">Keluar</span>
      </Button>
    </header>
  );
}
