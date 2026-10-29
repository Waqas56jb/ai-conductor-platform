"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

/** Leaflet touches `window` on import, so the map loads client-side only. */
export const TechnicianMapLazy = dynamic(() => import("./TechnicianMap"), {
  ssr: false,
  loading: () => <Skeleton height="300px" radius="14px" />,
});
