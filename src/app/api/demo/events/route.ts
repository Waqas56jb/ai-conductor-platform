import { NextResponse, type NextRequest } from "next/server";
import { recordEvent } from "@/lib/demo/booking";
import { allowedOrigin, preflight, withCors } from "@/lib/demo/cors";
import { siteEventSchema } from "@/lib/demo/schema";

/**
 * Anonymous funnel counter from the marketing site (page views, demo clicks,
 * video plays). No cookie, IP or identifier is stored, and visitors who ask
 * not to be tracked (Global Privacy Control, Do Not Track) are not counted.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const done = (status: number) => withCors(new NextResponse(null, { status }), origin);
  if (!allowedOrigin(origin)) return done(403);
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return done(204);

  // sendBeacon posts text/plain to skip the preflight.
  const parsed = siteEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return done(400);
  await recordEvent(parsed.data);
  return done(204);
}

export const OPTIONS = (request: NextRequest) => preflight(request.headers.get("origin"));
