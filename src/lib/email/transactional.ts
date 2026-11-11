import "server-only";
import { env } from "@/lib/env";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

export const transactionalEmailEnabled = () => Boolean(env.RESEND_API_KEY);

/**
 * Sends one email from the Pratonna address through Resend. Returns false
 * (never throws) when email is not configured or the send fails: callers keep
 * the record and the team still sees it in the app.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo,
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          content_type: a.contentType,
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("email send failed", res.status, await res.text());
    return res.ok;
  } catch (error) {
    console.error("email send failed", error);
    return false;
  }
}
