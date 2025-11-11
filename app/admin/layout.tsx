"use client";

import type React from "react";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  Megaphone,
  BarChart3,
  LogOut,
  Menu,
  X,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Buat Trip", path: "/admin/trips", icon: Map },
    { name: "Jadwal & Itinerary", path: "/admin/schedule", icon: Calendar },
    { name: "Peserta", path: "/admin/participants", icon: Users },
    {
      name: "Absensi & Kehadiran",
      path: "/admin/attendance",
      icon: CheckSquare,
    },
    { name: "Pengumuman", path: "/admin/announcements", icon: Megaphone },
    { name: "Laporan & Statistik", path: "/admin/reports", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="font-semibold text-slate-900">Admin Panel</h1>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut size={20} />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 w-64
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <h1 className="font-bold text-lg text-slate-900">
              Trip Komodo Admin
            </h1>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-slate-200">
            <p className="text-sm text-slate-600">Selamat datang,</p>
            <p className="font-semibold text-slate-900">{user?.name}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors text-left
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-slate-700 hover:bg-slate-100"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-200">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={logout}
            >
              <LogOut size={20} />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
