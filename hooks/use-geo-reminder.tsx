"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface Agenda {
  id: string;
  title: string;
  time: string;
  locationName?: string | null;
  locationLat?: number | string | null;
  locationLon?: number | string | null;
}

// helper: convert ke number atau null
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// Voice reminder khusus geo
function playGeoVoiceReminder(agenda: Agenda) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) {
    console.log("[useGeoReminder] Speech synthesis not supported");
    return;
  }

  const synth = window.speechSynthesis;

  try {
    // cancel suara sebelumnya biar tidak numpuk
    synth.cancel();
  } catch {
    // ignore
  }

  const parts: string[] = [];

  parts.push(`Agenda berikutnya, ${agenda.title}.`);

  if (agenda.time) {
    parts.push(`Dijadwalkan sekitar pukul ${agenda.time}.`);
  }

  if (agenda.locationName) {
    parts.push(`Lokasi, ${agenda.locationName}.`);
  }

  parts.push("Anda sudah dekat dengan lokasi. Jangan lupa melakukan check in.");

  const message = parts.join(" ");

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "id-ID";
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;

  setTimeout(() => {
    synth.speak(utterance);
  }, 500);
}

export function useGeoReminder(
  nextAgenda: Agenda | null,
  enabled = true,
  options?: { radiusMeters?: number }
) {
  const [hasNotified, setHasNotified] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // fallback global default kalau options belum diisi
  const reminderRadius =
    typeof options?.radiusMeters === "number" && options.radiusMeters > 0
      ? options.radiusMeters
      : 1000; // 1 km default

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // meter
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  const checkProximity = useCallback(
    (position: GeolocationPosition) => {
      if (!nextAgenda || !enabled) return;

      const agendaLat = toNumberOrNull(nextAgenda.locationLat);
      const agendaLng = toNumberOrNull(nextAgenda.locationLon);

      if (agendaLat === null || agendaLng === null) {
        return;
      }

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      setUserPosition({ lat: userLat, lng: userLng });

      const distance = calculateDistance(
        userLat,
        userLng,
        agendaLat,
        agendaLng
      );

      if (distance <= reminderRadius  && hasNotified !== nextAgenda.id) {
        setHasNotified(nextAgenda.id);

        if (typeof window !== "undefined") {
          localStorage.setItem(`notified_${nextAgenda.id}`, "true");
        }

        // Toast di dalam app (utama)
        toast({
          title: "📍 Anda Sudah Dekat!",
          description: `${nextAgenda.title} sudah dekat dari lokasi Anda. Jangan lupa check-in!`,
          duration: 8000,
        });

        // Voice reminder
        playGeoVoiceReminder(nextAgenda);

        // Browser notification (opsional, jangan sampai bikin error)
        if (typeof window !== "undefined" && "Notification" in window) {
          try {
            const N: any = (window as any).Notification;
            if (N && typeof N === "function" && N.permission === "granted") {
              new N("Agenda Terdekat", {
                body: `${nextAgenda.title} - sudah dekat dari lokasi Anda`,
                icon: "/icon-192x192.png",
              });
            }
          } catch (err) {
            console.warn(
              "[useGeoReminder] Gagal menampilkan browser notification:",
              err
            );
          }
        }
      }
    },
    [nextAgenda, enabled, hasNotified, calculateDistance]
  );

  useEffect(() => {
    if (!enabled || !nextAgenda) return;
    if (typeof window === "undefined") return;

    const alreadyNotified = localStorage.getItem(`notified_${nextAgenda.id}`);
    if (alreadyNotified) {
      setHasNotified(nextAgenda.id);
    }

    // minta permission notification (best effort)
    if ("Notification" in window) {
      const N: any = (window as any).Notification;
      if (
        N &&
        N.permission === "default" &&
        typeof N.requestPermission === "function"
      ) {
        N.requestPermission().catch((err: unknown) => {
          console.warn("[useGeoReminder] Notification permission error:", err);
        });
      }
    }

    // setup geolocation tracking
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        checkProximity,
        (error) => {
          console.log("[useGeoReminder] Geolocation error:", error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [nextAgenda, enabled, checkProximity]);

  return { userPosition, hasNotified };
}
