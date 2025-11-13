"use client";

import { useEffect, useRef, useState } from "react";
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

  // Leaflet refs
  const mapContainerId = "trip-map-container";
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

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

  // fetch data dari API (visited sudah dihitung di backend berdasarkan JWT)
  useEffect(() => {
    if (!tripId) return;

    let abort = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trips/${tripId}/map-journey`, {
          cache: "no-store",
          // cookie auth (dari login) akan ikut otomatis karena same-origin
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
    if (mapRef.current) return; // sudah dibuat

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

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [center.lat, center.lng]);

  // Update markers saat locations berubah
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

      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: 8,
        weight: 2,
        color: isVisited ? "#16a34a" : "#2563eb", // green vs blue
        fillColor: isVisited ? "#22c55e" : "#3b82f6",
        fillOpacity: 0.8,
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

      marker.bindPopup(popupHtml, {
        closeButton: true,
        offset: L.point(0, -4),
      });

      marker.on("click", () => {
        setActiveLocation(loc); // tetap sync dengan card di bawah
        marker.openPopup(); // pastikan popup kebuka
      });

      marker.addTo(layer);
      bounds.push([loc.lat, loc.lng]);
    });

    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [24, 24] });
    }
  }, [locations, center]);

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
                  Dikunjungi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-muted-foreground">
                  Belum Dikunjungi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-muted-foreground">
                  Rute Kapal
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
