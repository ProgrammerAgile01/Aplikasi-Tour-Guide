"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-client";

export default function ClientHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">Selamat datang,</p>
        <p className="font-semibold text-sm">{user?.name ?? "Pengguna"}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
        <LogOut size={16} />
        <span className="hidden sm:inline">Keluar</span>
      </Button>
    </header>
  );
}
