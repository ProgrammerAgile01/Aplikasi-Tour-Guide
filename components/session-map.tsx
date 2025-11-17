"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// perbaiki icon marker default (supaya muncul)
delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type SessionMapProps = {
  lat: number;
  lon: number;
  title?: string;
};

export default function SessionMap({ lat, lon, title }: SessionMapProps) {
  const center: [number, number] = [lat, lon];

  return (
    <div className="relative w-full h-56 overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <TileLayer
          // OpenStreetMap tile
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={center}>{title && <Popup>{title}</Popup>}</Marker>
      </MapContainer>
    </div>
  );
}
