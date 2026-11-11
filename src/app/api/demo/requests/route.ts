import { NextResponse, type NextRequest } from "next/server";
import { bookDemo } from "@/lib/demo/booking";
import { allowedOrigin, preflight, withCors } from "@/lib/demo/cors";
import { demoRequestSchema } from "@/lib/demo/schema";

/**
 * Books a free demo from the marketing site: validates, holds the slot,
 * emails the prospect and the team. Only the site's origins may call it.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const reply = (body: unknown, status = 200) =>
    withCors(NextResponse.json(body, { status }), origin);
  if (!allowedOrigin(origin)) return reply({ error: "forbidden" }, 403);

  const body = await request.json().catch(() => null);
  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    // A filled honeypot gets the same answer as a success, and nothing is saved.
    if (body && typeof body === "object" && "website" in body && body.website)
      return reply({ ok: true });
    return reply(
      { error: "invalid", fields: parsed.error.issues.map((i) => i.path.join(".")) },
      400,
    );
  }

  const result = await bookDemo(parsed.data);
  if (!result.ok) return reply({ error: result.error }, result.error === "too_many" ? 429 : 409);
  return reply(result, 201);
}

export const OPTIONS = (request: NextRequest) => preflight(request.headers.get("origin"));
