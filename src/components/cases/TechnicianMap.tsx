"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import styles from "./TechnicianMap.module.css";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "incident" | "technician";
  selected?: boolean;
};

// CSS-only markers: no image assets to resolve through the bundler.
const icon = (kind: MapPoint["kind"], selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="${styles.pin} ${kind === "incident" ? styles.incident : selected ? styles.selected : styles.tech}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const PARIS: [number, number] = [48.8566, 2.3522];

/** Rendered only in the browser (Leaflet needs `window`); see TechnicianMapLazy. */
export default function TechnicianMap({ points, label }: { points: MapPoint[]; label: string }) {
  const located = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const bounds =
    located.length > 1 ? L.latLngBounds(located.map((p) => [p.lat, p.lng])) : undefined;
  const center: [number, number] = located[0] ? [located[0].lat, located[0].lng] : PARIS;

  return (
    <div className={styles.frame} role="img" aria-label={label}>
      <MapContainer
        center={center}
        zoom={13}
        bounds={bounds}
        boundsOptions={{ padding: [32, 32] }}
        scrollWheelZoom={false}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((p) => (
          <Marker
            key={`${p.kind}-${p.id}`}
            position={[p.lat, p.lng]}
            icon={icon(p.kind, Boolean(p.selected))}
          >
            <Tooltip>{p.label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
