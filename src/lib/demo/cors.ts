import { NextResponse } from "next/server";

// The marketing site (legacy/client) calls these endpoints from the browser.
const SITE_ORIGINS = [
  "https://pratonna.com",
  "https://www.pratonna.com",
  "https://pratonna-landing.vercel.app",
  process.env.NEXT_PUBLIC_SITE_URL,
  // Local landing (vite preview / dev) against a local app; never on Vercel.
  ...(process.env.VERCEL ? [] : ["http://localhost:4173", "http://localhost:5173"]),
].filter(Boolean) as string[];

export const allowedOrigin = (origin: string | null) =>
  origin !== null && SITE_ORIGINS.includes(origin.replace(/\/$/, "")) ? origin : null;

export function withCors(res: NextResponse, origin: string | null) {
  const allowed = allowedOrigin(origin);
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

/** Answer to the browser's preflight. */
export function preflight(origin: string | null) {
  const res = new NextResponse(null, { status: allowedOrigin(origin) ? 204 : 403 });
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  return withCors(res, origin);
}
