"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { MapPin, Compass, Loader2, MapPinned, LocateFixed } from "lucide-react";
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

  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>(
    []
  );

  const mapContainerId = "trip-map-container";
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const userRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const userRouteRef = useRef<L.Polyline | null>(null);

  const initialFitDoneRef = useRef(false);
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);

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

  const nextUnvisited = useMemo(() => {
    const unvisited = locations.filter((l) => !l.visited);
    if (!unvisited.length) return null;
    return [...unvisited].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.time.localeCompare(b.time);
    })[0];
  }, [locations]);

  const createMarkerIcon = (isVisited: boolean) => {
    const bg = isVisited ? "#22c55e" : "#3b82f6";

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

  // Fetch data
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
        if (!abort) {
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

          initialFitDoneRef.current = false;
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

  // Init map
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Sinkron ref userPosition (buat initial fitBounds)
  useEffect(() => {
    userPositionRef.current = userPosition;
  }, [userPosition]);

  // Markers + routePath segmented polyline + initial fitBounds
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const map = mapRef.current;
    const layer = markersLayerRef.current;

    layer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 🔹 Marker tiap lokasi
    if (locations.length) {
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
          map.setView([loc.lat, loc.lng], 14, { animate: true });
        });

        marker.addTo(layer);
        bounds.push([loc.lat, loc.lng]);
      });
    }

    // Gambar garis rute trip (pakai routePath kalau ada)
    if (routePath.length > 1 && locations.length > 1) {
      // urutkan lokasi sesuai urutan hari + jam
      const ordered = [...locations].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.time.localeCompare(b.time);
      });

      // cari index terdekat di routePath untuk tiap lokasi
      const routeIndices = ordered.map((loc) => {
        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < routePath.length; i++) {
          const p = routePath[i];
          const dx = p.lat - loc.lat;
          const dy = p.lng - loc.lng;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        return bestIdx;
      });

      for (let i = 0; i < ordered.length - 1; i++) {
        const from = ordered[i];
        const to = ordered[i + 1];

        let idxFrom = routeIndices[i];
        let idxTo = routeIndices[i + 1];

        if (idxFrom === idxTo) continue;
        if (idxFrom > idxTo) {
          const tmp = idxFrom;
          idxFrom = idxTo;
          idxTo = tmp;
        }

        const segmentPoints = routePath
          .slice(idxFrom, idxTo + 1)
          .map((p) => [p.lat, p.lng] as L.LatLngExpression);

        if (!segmentPoints.length) continue;

        // Hijau kalau kedua lokasi sudah dikunjungi, selain itu biru
        const color = from.visited && to.visited ? "#22c55e" : "#0ea5e9";

        const segLine = L.polyline(segmentPoints, {
          color,
          weight: 3,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        });

        segLine.addTo(layer);
        segmentPoints.forEach((p) => bounds.push(p));
      }
    } else if (locations.length > 1) {
      // fallback: garis lurus antar titik kalau routePath kosong
      const ordered = [...locations].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.time.localeCompare(b.time);
      });

      for (let i = 0; i < ordered.length - 1; i++) {
        const from = ordered[i];
        const to = ordered[i + 1];

        const color = from.visited && to.visited ? "#22c55e" : "#0ea5e9";

        const segLine = L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          {
            color,
            weight: 3,
            opacity: 0.9,
            lineJoin: "round",
            lineCap: "round",
          }
        );

        segLine.addTo(layer);
        bounds.push([from.lat, from.lng]);
        bounds.push([to.lat, to.lng]);
      }
    }

    // tambahkan posisi user (kalau sudah ada) hanya untuk initial fit
    if (userPositionRef.current) {
      bounds.push([userPositionRef.current.lat, userPositionRef.current.lng]);
    }

    if (bounds.length > 0 && !initialFitDoneRef.current) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [32, 32] });
      initialFitDoneRef.current = true;
    }

    if (!locations.length && !userPositionRef.current) {
      map.setView([center.lat, center.lng], 10);
    }
  }, [locations, center, routePath]);

  // Geolocation
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

  // Marker user
  useEffect(() => {
    if (!userPosition || !mapRef.current) return;
    const map = mapRef.current;

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
    } else {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    }

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

  // Rute user -> nextUnvisited (orange)
  useEffect(() => {
    if (!userPosition || !nextUnvisited) {
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

        const latLngs = coords.map((c) => [c[1], c[0]] as L.LatLngExpression);

        const layer = userRouteLayerRef.current!;
        if (userRouteRef.current) {
          layer.removeLayer(userRouteRef.current);
        }

        const polyline = L.polyline(latLngs, {
          color: "#f97316",
          weight: 4,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        });

        polyline.addTo(layer);
        userRouteRef.current = polyline;
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

        {geoError && (
          <p className="text-[11px] text-red-200 mt-1 max-w-md">{geoError}</p>
        )}
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
              <>
                <div id={mapContainerId} className="w-full h-full" />
                {/* Tombol Fokus ke Saya */}
                {userPosition && (
                  <div className="absolute bottom-3 left-3 z-[400]">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Fokus ke lokasi saya"
                      className="h-9 w-9 rounded-xl bg-white shadow-md border border-slate-200 p-0 flex items-center justify-center"
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.setView(
                            [userPosition.lat, userPosition.lng],
                            15,
                            { animate: true }
                          );
                        }
                      }}
                    >
                      <LocateFixed className="w-5 h-5 text-slate-700" />
                    </Button>
                  </div>
                )}
              </>
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
              <MapPinned className="w-5 h-5 text-primary" />
              Rute & Destinasi Perjalanan
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
                onClick={() => {
                  const isSame = activeLocation?.id === location.id;
                  const newActive = isSame ? null : location;
                  setActiveLocation(newActive);

                  if (mapRef.current) {
                    mapRef.current.setView([location.lat, location.lng], 14, {
                      animate: true,
                    });
                  }
                }}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                        <span className="font-semibold text-blue-700">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
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
