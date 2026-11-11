import { NextResponse, type NextRequest } from "next/server";
import { availableSlots } from "@/lib/demo/booking";
import { preflight, withCors } from "@/lib/demo/cors";

export const dynamic = "force-dynamic";

/** Free demo slots of the next two weeks (ISO instants, Paris office hours). */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const res = NextResponse.json({ slots: await availableSlots() });
  res.headers.set("Cache-Control", "no-store");
  return withCors(res, origin);
}

export const OPTIONS = (request: NextRequest) => preflight(request.headers.get("origin"));
