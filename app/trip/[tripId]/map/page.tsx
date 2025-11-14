"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { MapPin, Navigation, Anchor, Compass, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  day: number;
  time: string;
  visited: boolean;
  type: "airport" | "island" | "beach" | "port";
  description: string;
  locationText?: string;
}

interface MapApiResponse {
  ok: boolean;
  trip?: {
    id: string;
    name: string;
  };
  center?: {
    lat: number;
    lng: number;
  };
  locations?: Location[];
  routePath?: { lat: number; lng: number }[];
  message?: string;
}

export default function MapJourneyPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;

  const [tripName, setTripName] = useState<string>("Peta Perjalanan");
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: -8.55,
    lng: 119.5,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Posisi user (realtime)
  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>(
    []
  );

  // Leaflet refs
  const mapContainerId = "trip-map-container";
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null); // untuk titik lokasi trip & rute kapal
  const userMarkerRef = useRef<L.Marker | null>(null); // marker posisi user
  const userAccuracyRef = useRef<L.Circle | null>(null); // lingkaran akurasi
  const userRouteLayerRef = useRef<L.LayerGroup | null>(null); // layer khusus rute user → target
  const userRouteRef = useRef<L.Polyline | null>(null); // polyline rute user → target

  const getIconForType = (type: string) => {
    switch (type) {
      case "airport":
        return "✈️";
      case "island":
        return "🏝️";
      case "beach":
        return "🏖️";
      case "port":
        return "⚓";
      default:
        return "📍";
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank"
    );
  };

  const visitedCount = locations.filter((loc) => loc.visited).length;
  const totalLocations = locations.length;
  const progress =
    totalLocations > 0 ? Math.round((visitedCount / totalLocations) * 100) : 0;

  // Lokasi pertama yang belum dikunjungi (berdasarkan day + time)
  const nextUnvisited = useMemo(() => {
    const unvisited = locations.filter((l) => !l.visited);
    if (!unvisited.length) return null;
    return [...unvisited].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.time.localeCompare(b.time);
    })[0];
  }, [locations]);

  // Custom marker pin tanpa emoji (trip markers)
  const createMarkerIcon = (isVisited: boolean) => {
    const bg = isVisited ? "#22c55e" : "#3b82f6"; // hijau / biru

    return L.divIcon({
      className: "",
      html: `
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          background: ${bg};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 10px solid ${bg};
          "></div>
        </div>
      `,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      popupAnchor: [0, -32],
    });
  };

  // Fetch data dari API (visited dihitung di backend via JWT)
  useEffect(() => {
    if (!tripId) return;

    let abort = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips/${tripId}/map-journey`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || "Gagal memuat data peta");
        }

        const data: MapApiResponse = await res.json();
        if (abort) return;

        if (!data.ok) {
          throw new Error(data.message || "Gagal memuat data peta");
        }

        setTripName(data.trip?.name || "Peta Perjalanan");
        setLocations(data.locations || []);
        setRoutePath(data.routePath || []);

        if (data.center) {
          setCenter(data.center);
        } else if (data.locations && data.locations.length > 0) {
          const first = data.locations[0];
          setCenter({ lat: first.lat, lng: first.lng });
        }
      } catch (err: any) {
        console.error(err);
        if (!abort) {
          setError(err.message || "Terjadi kesalahan saat memuat data");
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }

    loadData();

    return () => {
      abort = true;
    };
  }, [tripId]);

  // Init Leaflet map (sekali)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current) return;

    const container = document.getElementById(mapContainerId);
    if (!container) return;

    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: 10,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const userRouteLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    userRouteLayerRef.current = userRouteLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userRouteLayerRef.current = null;
      userMarkerRef.current = null;
      userAccuracyRef.current = null;
      userRouteRef.current = null;
    };
    // center di dependency cuma untuk initial, tidak apa-apa dipanggil sekali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Update markers + polyline trip (pakai OSRM kalau ada)
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const map = mapRef.current;
    const layer = markersLayerRef.current;

    layer.clearLayers();

    if (!locations.length) {
      map.setView([center.lat, center.lng], 10);
      return;
    }

    const bounds: L.LatLngExpression[] = [];

    locations.forEach((loc, index) => {
      const isVisited = loc.visited;

      const marker = L.marker([loc.lat, loc.lng], {
        icon: createMarkerIcon(isVisited),
      });

      const popupHtml = `
      <div style="font-size:12px; line-height:1.4;">
        <strong>#${index + 1} ${loc.name}</strong><br/>
        Hari ${loc.day} • ${loc.time}<br/>
        ${loc.locationText ? `<small>${loc.locationText}</small><br/>` : ""}
        <small>Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(
        4
      )}</small><br/>
        ${
          isVisited
            ? `<span style="color:#16a34a; font-weight:600;">✓ Sudah dikunjungi</span>`
            : `<span style="color:#2563eb;">Belum dikunjungi</span>`
        }
      </div>
    `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        setActiveLocation(loc);
        marker.openPopup();
      });

      marker.addTo(layer);
      bounds.push([loc.lat, loc.lng]);
    });

    // Pakai routePath dari backend (OSRM); kalau kosong baru fallback garis lurus
    let tripPath: L.LatLngExpression[] = [];

    if (routePath.length > 1) {
      tripPath = routePath.map((p) => [p.lat, p.lng] as L.LatLngExpression);
    } else if (locations.length > 1) {
      tripPath = locations.map(
        (loc) => [loc.lat, loc.lng] as L.LatLngExpression
      );
    }

    if (tripPath.length > 1) {
      const polyline = L.polyline(tripPath, {
        color: "#0ea5e9",
        weight: 3,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      });
      polyline.addTo(layer);
    }

    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [24, 24] });
    }
  }, [locations, center, routePath]);

  // Geolocation: pantau posisi user (tanpa tergantung map)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setGeoError("Perangkat tidak mendukung GPS / geolocation.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPosition({ lat: latitude, lng: longitude });
        setGeoError(null);
      },
      (err) => {
        console.warn("Geolocation error", err);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            "Izin lokasi ditolak. Aktifkan akses lokasi untuk melihat posisi Anda di peta."
          );
        } else {
          setGeoError("Tidak bisa mendapatkan lokasi perangkat.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Gambar / update marker posisi user + auto-center pertama kali
  useEffect(() => {
    if (!userPosition || !mapRef.current) return;
    const map = mapRef.current;

    // marker user
    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #2563eb;
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(37,99,235,0.9);
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: userIcon,
      }).addTo(map);

      // saat pertama kali dapat posisi, langsung center ke user
      map.setView([userPosition.lat, userPosition.lng], 13, { animate: true });
    } else {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    }

    // lingkaran akurasi (opsional, pakai radius approx 50m jika tidak tahu)
    if (!userAccuracyRef.current) {
      userAccuracyRef.current = L.circle([userPosition.lat, userPosition.lng], {
        radius: 50,
        color: "#2563eb",
        weight: 1,
        opacity: 0.3,
        fillColor: "#60a5fa",
        fillOpacity: 0.1,
      }).addTo(map);
    } else {
      userAccuracyRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    }
  }, [userPosition]);

  // Bangun rute dari posisi user → lokasi pertama yang belum dikunjungi (pakai OSRM)
  useEffect(() => {
    if (!userPosition || !nextUnvisited) {
      // kalau tidak ada target, hapus rute lama
      if (userRouteRef.current && userRouteLayerRef.current) {
        userRouteLayerRef.current.removeLayer(userRouteRef.current);
        userRouteRef.current = null;
      }
      return;
    }
    if (!mapRef.current || !userRouteLayerRef.current) return;

    let aborted = false;

    async function buildRoute() {
      try {
        const from = `${userPosition.lng},${userPosition.lat}`;
        const to = `${nextUnvisited.lng},${nextUnvisited.lat}`;

        const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal membangun rute OSRM");
        const data = await res.json();

        const coords: [number, number][] =
          data?.routes?.[0]?.geometry?.coordinates || [];

        if (!coords.length || aborted) return;

        const latLngs = coords.map(
          (c) => [c[1], c[0]] as L.LatLngExpression // [lat, lng]
        );

        const layer = userRouteLayerRef.current!;
        // hapus rute lama jika ada
        if (userRouteRef.current) {
          layer.removeLayer(userRouteRef.current);
        }

        const polyline = L.polyline(latLngs, {
          color: "#f97316", // oranye biar beda
          weight: 4,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        });

        polyline.addTo(layer);
        userRouteRef.current = polyline;

        // fit ke rute user → target
        const map = mapRef.current!;
        map.fitBounds(polyline.getBounds(), { padding: [32, 32] });
      } catch (e) {
        console.warn("Gagal membuat rute user → lokasi pertama:", e);
      }
    }

    buildRoute();

    return () => {
      aborted = true;
    };
  }, [userPosition, nextUnvisited]);

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      {/* Header Stats */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {tripName || "Peta Perjalanan"}
            </h1>
            <p className="text-sm text-blue-100">Rute Sailing Trip Anda</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Total Lokasi</p>
            <p className="text-2xl font-bold">{totalLocations}</p>
          </div>
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Dikunjungi</p>
            <p className="text-2xl font-bold">{visitedCount}</p>
          </div>
          <div className="flex-1 bg-white/20 rounded-lg p-3">
            <p className="text-xs text-blue-100">Progress</p>
            <p className="text-2xl font-bold">{progress}%</p>
          </div>
        </div>

        {/* {geoError && (
          <p className="text-[11px] text-red-200 mt-1 max-w-md">{geoError}</p>
        )}
        {userPosition && !geoError && (
          <p className="text-[11px] text-blue-100/80 mt-1">
            Posisi Anda: {userPosition.lat.toFixed(4)},{" "}
            {userPosition.lng.toFixed(4)}
          </p>
        )} */}
      </div>

      <div className="p-4 space-y-4">
        {/* Map Leaflet */}
        <Card className="overflow-hidden">
          <div className="relative w-full h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat peta perjalanan...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-sm text-red-500 px-4 text-center">
                {error}
              </div>
            ) : (
              <div id={mapContainerId} className="w-full h-full" />
            )}
          </div>
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-muted-foreground">
                  Lokasi trip dikunjungi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-muted-foreground">
                  Lokasi trip belum dikunjungi
                </span>
              </div>
              {/* <div className="flex items-center gap-2">
                <Navigation className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-muted-foreground">
                  Garis rute kapal (trip)
                </span>
              </div> */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-white shadow bg-orange-400"></div>
                <span className="text-xs text-muted-foreground">
                  Rute Anda → lokasi berikutnya
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Location List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Anchor className="w-5 h-5 text-primary" />
              Daftar Lokasi Perjalanan
            </h2>
            <Badge variant="secondary">{totalLocations} Titik</Badge>
          </div>

          {loading && (
            <div className="text-xs text-muted-foreground">
              Memuat daftar lokasi...
            </div>
          )}

          {!loading && !locations.length && !error && (
            <div className="text-sm text-muted-foreground">
              Belum ada titik lokasi dengan koordinat untuk trip ini.
            </div>
          )}

          <div className="space-y-2">
            {locations.map((location, index) => (
              <Card
                key={location.id}
                className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                  activeLocation?.id === location.id
                    ? "ring-2 ring-primary"
                    : ""
                }`}
                onClick={() =>
                  setActiveLocation(
                    activeLocation?.id === location.id ? null : location
                  )
                }
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">
                        {getIconForType(location.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{index + 1}
                          </span>
                          <h3 className="font-semibold text-foreground">
                            {location.name}
                          </h3>
                          {nextUnvisited?.id === location.id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-orange-400 text-orange-500"
                            >
                              Tujuan berikutnya
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hari {location.day} • Pukul {location.time}
                        </p>
                        {location.locationText && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {location.locationText}
                          </p>
                        )}
                        {location.visited && (
                          <Badge
                            variant="default"
                            className="mt-2 bg-green-100 text-green-700 border-green-200"
                          >
                            <span className="mr-1">✓</span>
                            Sudah Dikunjungi
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        location.visited ? "bg-green-500" : "bg-blue-600"
                      } text-white shadow`}
                    >
                      <MapPin size={16} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {activeLocation?.id === location.id && (
                    <div className="pt-3 border-t border-border space-y-3 animate-in slide-in-from-top-2">
                      <p className="text-sm text-muted-foreground">
                        {location.description ||
                          "Detail lokasi belum ditambahkan."}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted rounded p-2">
                          <p className="text-muted-foreground">Latitude</p>
                          <p className="font-mono font-semibold">
                            {location.lat.toFixed(4)}
                          </p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-muted-foreground">Longitude</p>
                          <p className="font-mono font-semibold">
                            {location.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGoogleMaps(location.lat, location.lng);
                        }}
                      >
                        <MapPin size={16} />
                        Buka di Google Maps
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
