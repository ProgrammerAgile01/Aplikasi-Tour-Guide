"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  center: [number, number];
  zoom?: number;
  onPick?: (lat: number, lon: number) => void;
};

export function LeafletPicker({ center, zoom = 12, onPick }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fix default marker icon (pakai CDN, jadi selalu ada gambarnya)
  useEffect(() => {
    const DefaultIcon = L.icon({
      iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  const [lat, lng] = center;

  // Inisialisasi map + klik untuk pilih titik
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView([lat, lng], zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], {
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onPick?.(pos.lat, pos.lng);
        });
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }

      onPick?.(lat, lng);
    };

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // pakai center awal saja saat pertama kali mount

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

  return <div ref={containerRef} className="w-full h-full" />;
}