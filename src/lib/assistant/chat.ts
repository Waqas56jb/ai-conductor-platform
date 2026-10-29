import type { AiActionStatus } from "@/lib/db/types";

/** One row of the chat as the UI shows it. */
export type ChatItem =
  | { id: string; kind: "user" | "assistant"; text: string; at: string }
  | { id: string; kind: "read"; tool: string; at: string }
  | {
      id: string;
      kind: "proposal";
      at: string;
      action: { id: string; summary: string; status: AiActionStatus };
    };

/** Body of POST /api/assistant. */
export type AssistantRequest = { conversationId: string | null; text: string };
