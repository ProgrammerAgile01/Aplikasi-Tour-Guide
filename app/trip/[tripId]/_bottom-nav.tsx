"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Map,
  Star,
  Image as Gallery,
} from "lucide-react";

type NavItem = {
  name: string;
  path: string;
  icon: "home" | "calendar" | "map" | "gallery" | "star";
};

export default function ClientBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const getIcon = (key: NavItem["icon"]) => {
    switch (key) {
      case "home":
        return Home;
      case "calendar":
        return Calendar;
      case "map":
        return Map;
      case "gallery":
        return Gallery;
      case "star":
        return Star;
      default:
        return Home;
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-5 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="flex">
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
        </div>
      </nav>

      {/* Copyright di bawah nav */}
      <div className="fixed bottom-0 left-0 right-0 h-5 flex items-center justify-center z-50 bg-white">
        <span className="text-[10px] text-muted-foreground opacity-70">
          Supported by <a href="https://agilestore.id" target="_blank" className="font-semibold">Agile</a> © 2025
        </span>
      </div>
    </>
  );
}
