"use client";

import { useEffect, useRef, useState } from "react";
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

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fix default marker icon (pakai CDN, jadi selalu ada gambarnya)
  useEffect(() => {
    const DefaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
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

  // helper untuk set / pindah marker + panggil onPick
  function placeMarkerAndPick(newLat: number, newLng: number) {
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([newLat, newLng], {
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onPick?.(pos.lat, pos.lng);
      });
    } else {
      markerRef.current.setLatLng([newLat, newLng]);
    }

    onPick?.(newLat, newLng);
  }

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
      placeMarkerAndPick(lat, lng);
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

  // kalau props center berubah, pindahin view
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

  // === HANDLE SEARCH ===
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;

    try {
      setSearching(true);
      setSearchError(null);

      const u = new URL("/api/osm/geocode", window.location.origin);
      u.searchParams.set("q", q);
      // pakai center sekarang sebagai "near" biar hasilnya relevan
      u.searchParams.set("near", `${lat},${lng}`);

      const res = await fetch(u.toString(), { cache: "no-store" });
      const json = await res.json();

      if (!json?.ok || !json?.found) {
        setSearchError("Lokasi tidak ditemukan. Coba kata kunci lain.");
        return;
      }

      const foundLat = Number(json.lat);
      const foundLon = Number(json.lon);

      if (!Number.isFinite(foundLat) || !Number.isFinite(foundLon)) {
        setSearchError("Koordinat hasil pencarian tidak valid.");
        return;
      }

      if (mapRef.current) {
        mapRef.current.setView([foundLat, foundLon], 15);
      }
      placeMarkerAndPick(foundLat, foundLon);
    } catch (err) {
      setSearchError("Gagal mencari lokasi. Coba lagi sebentar lagi.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search bar di atas map */}
      <form
        onSubmit={handleSearch}
        className="p-2 flex gap-2 items-center bg-white/80 z-[1000]"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm"
          placeholder="Cari lokasi..."
        />
        <button
          type="submit"
          disabled={searching}
          className="px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white disabled:opacity-60"
        >
          {searching ? "Mencari..." : "Cari"}
        </button>
      </form>

      {searchError && (
        <p className="px-2 text-xs text-red-600">{searchError}</p>
      )}

      {/* Map */}
      <div ref={containerRef} className="w-full flex-1" />
    </div>
  );
}
