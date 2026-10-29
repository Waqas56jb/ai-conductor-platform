import "server-only";

// Base Adresse Nationale (French government, free, no key): good for France.
const API = "https://api-adresse.data.gouv.fr";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { label: string; city: string; postcode?: string; name?: string };
};

export type GeoPoint = { lat: number; lng: number; label: string; city: string };

async function query(path: string): Promise<Feature | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { features?: Feature[] };
    return json.features?.[0] ?? null;
  } catch {
    return null; // Geocoding is a convenience; never block the workflow on it.
  }
}

const toPoint = (f: Feature): GeoPoint => ({
  lng: f.geometry.coordinates[0],
  lat: f.geometry.coordinates[1],
  label: f.properties.label,
  city: f.properties.city,
});

export async function geocode(address: string, city: string): Promise<GeoPoint | null> {
  const q = [address, city].filter(Boolean).join(" ").trim();
  if (q.length < 3) return null;
  const f = await query(`/search/?q=${encodeURIComponent(q)}&limit=1`);
  return f ? toPoint(f) : null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoPoint | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const f = await query(`/reverse/?lat=${lat}&lon=${lng}&limit=1`);
  return f ? toPoint(f) : null;
}
