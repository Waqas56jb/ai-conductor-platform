import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runAssistant, type AssistantEvent } from "@/lib/ai/assistant/run";
import {
  conversationItems,
  getAssistantSettings,
  openConversation,
  rateLimited,
} from "@/lib/ai/assistant/session";
import { getProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Several model round trips per message.
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  text: z.string().trim().min(1).max(4000),
});

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** A conversation's items, for the chat to refresh after a reply or a decision. */
export async function GET(request: NextRequest) {
  if (!(await getProfile())) return fail("common.unauthorized", 401);
  const id = z.uuid().safeParse(request.nextUrl.searchParams.get("c"));
  if (!id.success) return fail("assistant.errors.notFound", 400);
  // RLS: someone else's conversation reads as empty.
  return NextResponse.json({ items: await conversationItems(id.data) });
}

/** Sends a message; the reply streams back as newline-delimited JSON events. */
export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return fail("common.unauthorized", 401);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("assistant.errors.empty", 400);
  if (await rateLimited(profile.id)) return fail("assistant.errors.rateLimited", 429);

  const conversationId = await openConversation(profile, body.data.conversationId, body.data.text);
  if (!conversationId) return fail("assistant.errors.notFound", 404);

  const admin = createAdminClient();
  const [persona, { data: memories }, { data: company }] = await Promise.all([
    getAssistantSettings(),
    admin
      .from("ai_conductor_assistant_memories")
      .select("kind, content, approved")
      .eq("user_id", profile.id)
      .eq("approved", true)
      .order("created_at")
      .limit(50),
    admin.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
  ]);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AssistantEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      emit({ type: "conversation", id: conversationId });
      try {
        await runAssistant({
          profile,
          conversationId,
          persona,
          memories: memories ?? [],
          companyName: company?.name ?? "",
          text: body.data.text,
          emit,
        });
      } catch (e) {
        console.error("[assistant] run failed", e);
        emit({ type: "error", error: "assistant.errors.failed" });
      } finally {
        await admin
          .from("ai_conductor_ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
        emit({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
