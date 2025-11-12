"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Map,
  Star,
  // Kalau kamu sebelumnya pakai 'Battery as Gallery', boleh ganti di sini:
  Image as Gallery,
  Battery, // cadangan jika kamu memang ingin Battery sebagai ikon Galeri
} from "lucide-react";

type NavItem = {
  name: string;
  path: string;
  icon: "home" | "calendar" | "map" | "gallery" | "star";
};

export default function ClientBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Mapping ikon berdasarkan string agar props dari server tetap serializable
  const getIcon = (key: NavItem["icon"]) => {
    switch (key) {
      case "home":
        return Home;
      case "calendar":
        return Calendar;
      case "map":
        return Map;
      case "gallery":
        // Pilih salah satu: Gallery (ikon Image) atau Battery
        return Gallery /* atau Battery */;
      case "star":
        return Star;
      default:
        return Home;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex gap-0 shadow-lg z-50">
      {items.map((item) => {
        const Icon = getIcon(item.icon);
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              isActive
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={24} />
            <span className="text-xs mt-1 font-medium text-center">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
