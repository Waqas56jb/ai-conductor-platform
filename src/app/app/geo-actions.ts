"use server";

import { requireProfile } from "@/lib/auth/session";
import { reverseGeocode, type GeoPoint } from "@/lib/geo";

/** Address for the browser's coordinates (French address API, server-side). */
export async function addressFromPosition(lat: number, lng: number): Promise<GeoPoint | null> {
  await requireProfile();
  return reverseGeocode(lat, lng);
}
