"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { esign, sendForSignature } from "@/lib/esign/signatures";
import { notify } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { VAT_RATES } from "@/lib/workflows/devis";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };
type SigningResult = { ok: true; url: string; requestId: string } | { ok: false; error: string };

const OFFICE = ["manager", "director", "admin"];
const cents = (n: number) => Math.round(n * 100) / 100;

// Error messages are keys of the "validation" namespace.
const contractSchema = z
  .object({
    clientId: z.uuid({ error: "required" }),
    title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
    terms: z.string().trim().max(8000, { error: "tooLong" }),
    startDate: z.iso.date({ error: "required" }),
    endDate: z.iso.date().or(z.literal("")),
    billing: z.enum(["one_off", "monthly", "yearly"]),
    amountHt: z.coerce.number({ error: "number" }).min(0, { error: "positive" }).max(10_000_000),
    taxRate: z.coerce
      .number()
      .refine((v) => (VAT_RATES as readonly number[]).includes(v), { error: "required" }),
  })
  .refine((c) => !c.endDate || c.endDate >= c.startDate, {
    error: "endBeforeStart",
    path: ["endDate"],
  });
export type ContractInput = z.input<typeof contractSchema>;

/** A draft contract with the next CTR-YYYY-NNNN number of the company (office only). */
export async function createContract(input: ContractInput): Promise<Result> {
  const profile = await requireProfile();
  if (!OFFICE.includes(profile.role)) return { ok: false, error: "common.forbidden" };
  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "contracts.errors.invalid", fieldErrors };
  }
  const c = parsed.data;
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("ai_conductor_users")
    .select("id")
    .eq("id", c.clientId)
    .eq("company_id", profile.company_id)
    .eq("role", "client")
    .maybeSingle();
  if (!client)
    return { ok: false, error: "contracts.errors.client", fieldErrors: { clientId: "required" } };

  const { data: n, error: numberError } = await admin.rpc("ai_conductor_next_number", {
    company: profile.company_id,
    counter_kind: "contrat",
  });
  if (numberError || n === null) return { ok: false, error: "common.error" };
  const reference = `CTR-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  const id = `CTR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { error } = await admin.from("ai_conductor_contracts").insert({
    id,
    reference,
    company_id: profile.company_id,
    client_id: c.clientId,
    title: c.title,
    terms: c.terms,
    start_date: c.startDate,
    end_date: c.endDate || null,
    billing: c.billing,
    amount_ht: cents(c.amountHt),
    tax_rate: c.taxRate,
    total_ttc: cents(c.amountHt * (1 + c.taxRate / 100)),
    created_by: profile.id,
  });
  if (error) return { ok: false, error: "common.error" };
  await audit(profile, "contract.created", { type: "contract", id }, { reference });
  revalidatePath("/app/contracts");
  return { ok: true };
}

async function officeContract(id: string) {
  const profile = await requireProfile();
  if (!OFFICE.includes(profile.role) || !/^CTR-[A-Z0-9]{4,40}$/.test(id)) return null;
  const { data } = await (
    await createClient()
  )
    .from("ai_conductor_contracts")
    .select("id, reference, title, status, client_id")
    .eq("id", id)
    .maybeSingle();
  return data ? { profile, contract: data } : null;
}

/** The client can now read and sign it (confirmed in the UI). */
export async function sendContract(id: string): Promise<Result> {
  const found = await officeContract(id);
  if (!found) return { ok: false, error: "contracts.errors.notFound" };
  const { profile, contract } = found;
  const { data } = await createAdminClient()
    .from("ai_conductor_contracts")
    .update({ status: "sent" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (!data?.length) return { ok: false, error: "contracts.errors.status" };
  await audit(profile, "contract.sent", { type: "contract", id });
  await notify({
    companyId: profile.company_id,
    userIds: [contract.client_id],
    type: "contract",
    title: `Contrat ${contract.reference} à signer`,
    body: contract.title,
  });
  revalidatePath("/app/contracts");
  return { ok: true };
}

export async function cancelContract(id: string): Promise<Result> {
  const found = await officeContract(id);
  if (!found) return { ok: false, error: "contracts.errors.notFound" };
  const { data } = await createAdminClient()
    .from("ai_conductor_contracts")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "sent"])
    .select("id");
  if (!data?.length) return { ok: false, error: "contracts.errors.status" };
  await audit(found.profile, "contract.cancelled", { type: "contract", id });
  revalidatePath("/app/contracts");
  return { ok: true };
}

/** The client signs a sent contract with DocuSign (an open envelope is reused). */
export async function startContractSigning(id: string): Promise<SigningResult> {
  const profile = await requireProfile();
  const provider = esign();
  if (!provider) return { ok: false, error: "quotes.sign.notConfigured" };
  if (profile.role !== "client" || !/^CTR-[A-Z0-9]{4,40}$/.test(id))
    return { ok: false, error: "contracts.errors.notFound" };
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("ai_conductor_contracts")
    .select("id, status, client_id, incident_id")
    .eq("id", id)
    .maybeSingle();
  if (!contract || contract.client_id !== profile.id)
    return { ok: false, error: "contracts.errors.notFound" };
  if (contract.status !== "sent") return { ok: false, error: "contracts.errors.status" };
  try {
    const { data: open } = await supabase
      .from("ai_conductor_signature_requests")
      .select("id, envelope_id")
      .eq("document_type", "contract")
      .eq("document_id", id)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const requestId =
      open?.id ??
      (await sendForSignature(profile, {
        type: "contract",
        id,
        incident_id: contract.incident_id,
      }));
    const envelopeId =
      open?.envelope_id ??
      (
        await supabase
          .from("ai_conductor_signature_requests")
          .select("envelope_id")
          .eq("id", requestId)
          .single()
      ).data?.envelope_id;
    if (!envelopeId) return { ok: false, error: "quotes.sign.failed" };
    const url = await provider.signingUrl({
      envelopeId,
      signer: {
        email: profile.email,
        name: profile.display_name || profile.email,
        clientUserId: profile.id,
      },
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/esign/return?r=${requestId}`,
      frameOrigin: new URL(env.NEXT_PUBLIC_APP_URL).origin,
    });
    return { ok: true, url, requestId };
  } catch (e) {
    console.error("[esign] contract signing failed", e);
    return { ok: false, error: "quotes.sign.failed" };
  }
}
