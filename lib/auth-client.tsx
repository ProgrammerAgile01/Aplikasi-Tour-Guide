"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type UserRole = string; // fleksibel (ADMIN, PESERTA, dll)

interface User {
  id?: string;
  username?: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  trips: Array<{ id: string; name: string; roleOnTrip?: string }>;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  trips: [],
  isLoading: true,
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<
    Array<{ id: string; name: string; roleOnTrip?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store", // <— hindari cache lama
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setUser(null);
        setTrips([]);
      } else {
        setUser(json.user ?? null);
        setTrips(json.trips ?? []);
      }
    } catch (err) {
      console.error("fetchSession error:", err);
      setUser(null);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return; // jangan redirect saat loading

    // Sudah login dan berada di halaman login → lempar ke tujuan
    if (user && pathname === "/login") {
      if (user.role === "ADMIN") {
        router.replace("/admin/dashboard");
        return;
      }
      if (trips.length === 1) {
        router.replace(`/trip/${trips[0].id}/overview`);
      } else {
        router.replace("/participant/select-trip");
      }
      return;
    }

    // Belum login dan bukan di halaman login / magic-login → bawa ke /login
    if (
      !user &&
      pathname !== "/login" &&
      pathname !== "/magic-login" &&
      !pathname.startsWith("/api")
    ) {
      router.replace("/login");
      return;
    }

    // Admin masuk area trip → arahkan ke admin
    if (user && user.role === "ADMIN" && pathname.startsWith("/trip")) {
      router.replace("/admin/dashboard");
      return;
    }

    // Non-admin masuk area admin → arahkan ke trip pertama / selector
    if (user && user.role !== "ADMIN" && pathname.startsWith("/admin")) {
      if (trips.length > 0) router.replace(`/trip/${trips[0].id}/overview`);
      else router.replace("/participant/select-trip");
      return;
    }
  }, [user, trips, isLoading, pathname, router]);

  const refreshSession = async () => {
    setIsLoading(true);
    await fetchSession();
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch (err) {
      console.error("logout error:", err);
    } finally {
      setUser(null);
      setTrips([]);
      router.replace("/login");
    }
  };

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-slate-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
  //         <p className="text-slate-600">Memuat...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <AuthContext.Provider
      value={{ user, trips, isLoading, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
