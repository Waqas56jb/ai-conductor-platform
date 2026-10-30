"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { openMailbox, removeAccount } from "@/lib/email/accounts";

type Result = { ok: true } | { ok: false; error: string };

const emailSchema = z.object({
  accountId: z.uuid(),
  to: z.email().max(320),
  subject: z.string().trim().min(1).max(250),
  body: z.string().trim().min(1).max(20_000),
  /** Provider id of the message being answered. */
  replyToId: z.string().min(1).max(500).nullish(),
});
export type EmailInput = z.input<typeof emailSchema>;

/**
 * Sends from one of the user's own mailboxes. People confirm in a dialog
 * first; the assistant only reaches this after the user approved its proposal.
 */
export async function sendEmail(input: EmailInput): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role === "client") return { ok: false, error: "common.forbidden" };
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "emails.errors.invalid" };
  const { accountId, to, subject, body, replyToId } = parsed.data;
  const box = await openMailbox(profile.id, accountId);
  if (!box) return { ok: false, error: "emails.errors.mailbox" };
  try {
    const original = replyToId ? await box.provider.message(box.accessToken, replyToId) : null;
    await box.provider.send(box.accessToken, {
      to,
      subject,
      body,
      replyTo: original
        ? { id: original.id, threadId: original.threadId, messageId: original.messageId }
        : null,
    });
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: "emails.errors.send" };
  }
  // Who sent what to whom; the body stays in the mailbox, not in our logs.
  await audit(
    profile,
    "email.sent",
    { type: "integration", id: accountId },
    {
      provider: box.account.provider,
      to,
      subject,
      reply: Boolean(replyToId),
    },
  );
  revalidatePath("/app/emails");
  return { ok: true };
}

/** Removes the mailbox and its tokens (confirmed in the UI). */
export async function disconnectMailbox(accountId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(accountId).success || !(await removeAccount(profile.id, accountId)))
    return { ok: false, error: "emails.errors.mailbox" };
  await audit(profile, "integration.disconnected", { type: "integration", id: accountId });
  revalidatePath("/app/settings/integrations");
  revalidatePath("/app/emails");
  return { ok: true };
}
