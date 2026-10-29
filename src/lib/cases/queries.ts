import "server-only";
import type {
  IncidentRow,
  InterventionRow,
  InvoiceRow,
  MessageRow,
  QuotationRow,
  TechnicianRow,
  UserRow,
} from "@/lib/db/types";
import { PHOTO_BUCKET, RECEIPT_BUCKET, signedUrls } from "@/lib/storage";
import type { IncidentStatus } from "@/lib/workflows/incident";
import { createClient } from "@/lib/supabase/server";

// Every read uses the signed-in user's client: RLS decides what each role sees.

export type Person = Pick<UserRow, "id" | "display_name" | "email" | "role" | "phone">;
const PERSON_COLUMNS = "id, display_name, email, role, phone";

export const CASE_LIST_COLUMNS =
  "id, reference, title, status, urgency, channel, city, building_address, client_id, complainant_name, hired_tech_ids, created_at, updated_at";
export type CaseListItem = Pick<
  IncidentRow,
  | "id"
  | "reference"
  | "title"
  | "status"
  | "urgency"
  | "channel"
  | "city"
  | "building_address"
  | "client_id"
  | "complainant_name"
  | "hired_tech_ids"
  | "created_at"
  | "updated_at"
>;

export async function listCases(filter?: {
  statuses?: readonly IncidentStatus[];
}): Promise<CaseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_conductor_incidents")
    .select(CASE_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter?.statuses?.length) query = query.in("status", [...filter.statuses]);
  const { data } = await query;
  return data ?? [];
}

/** People visible to the caller, by id (names on lists, chats, cards). */
export async function peopleById(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, Person>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_users")
    .select(PERSON_COLUMNS)
    .in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export type TechnicianCard = Person &
  Pick<
    TechnicianRow,
    | "specialty"
    | "experience_years"
    | "rating"
    | "jobs_completed"
    | "lat"
    | "lng"
    | "city"
    | "available"
  >;

/** Active technicians of the company with their field profile (team view). */
export async function listTechnicians(): Promise<TechnicianCard[]> {
  const supabase = await createClient();
  const [{ data: users }, { data: profiles }] = await Promise.all([
    supabase
      .from("ai_conductor_users")
      .select(PERSON_COLUMNS)
      .eq("role", "technician")
      .eq("active", true)
      .order("display_name"),
    supabase
      .from("ai_conductor_technicians")
      .select(
        "user_id, specialty, experience_years, rating, jobs_completed, lat, lng, city, available",
      ),
  ]);
  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return (users ?? []).map((u) => {
    const p = byUser.get(u.id);
    return {
      ...u,
      specialty: p?.specialty ?? null,
      experience_years: p?.experience_years ?? null,
      rating: p?.rating ?? null,
      jobs_completed: p?.jobs_completed ?? null,
      lat: p?.lat ?? null,
      lng: p?.lng ?? null,
      city: p?.city ?? null,
      available: p?.available ?? true,
    };
  });
}

export type ChatMessage = Pick<
  MessageRow,
  "id" | "from_id" | "from_name" | "from_role" | "text" | "created_at"
>;

export type CaseDetail = {
  incident: IncidentRow;
  quote: QuotationRow | null;
  intervention: InterventionRow | null;
  invoice: InvoiceRow | null;
  caseMessages: ChatMessage[];
  /** Team-only chat; null when the caller is not in the team (clients). */
  groupMessages: ChatMessage[] | null;
  people: Map<string, Person>;
  photoUrls: Record<string, string>;
  receiptUrl: string | null;
};

const MESSAGE_COLUMNS = "id, from_id, from_name, from_role, text, created_at";

export async function getCaseDetail(id: string): Promise<CaseDetail | null> {
  const supabase = await createClient();
  const { data: incident } = await supabase
    .from("ai_conductor_incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!incident) return null;

  const [quote, intervention, invoice, caseMessages, group] = await Promise.all([
    incident.quotation_id
      ? supabase
          .from("ai_conductor_quotations")
          .select("*")
          .eq("id", incident.quotation_id)
          .maybeSingle()
      : null,
    incident.intervention_id
      ? supabase
          .from("ai_conductor_interventions")
          .select("*")
          .eq("id", incident.intervention_id)
          .maybeSingle()
      : null,
    incident.invoice_id
      ? supabase
          .from("ai_conductor_invoices")
          .select("*")
          .eq("id", incident.invoice_id)
          .maybeSingle()
      : null,
    supabase
      .from("ai_conductor_incident_messages")
      .select(MESSAGE_COLUMNS)
      .eq("incident_id", id)
      .order("created_at")
      .limit(500),
    incident.group_id
      ? supabase
          .from("ai_conductor_task_groups")
          .select("id")
          .eq("id", incident.group_id)
          .maybeSingle()
      : null,
  ]);

  // RLS hides the team group from clients: no row means no team chat.
  const groupMessages = group?.data
    ? ((
        await supabase
          .from("ai_conductor_group_messages")
          .select(MESSAGE_COLUMNS)
          .eq("group_id", group.data.id)
          .order("created_at")
          .limit(500)
      ).data ?? [])
    : null;

  const quoteRow = quote?.data ?? null;
  const invoiceRow = invoice?.data ?? null;
  const [people, photoUrls, receipt] = await Promise.all([
    peopleById([
      incident.client_id,
      incident.manager_id,
      ...incident.hired_tech_ids,
      quoteRow?.created_by,
      ...(caseMessages.data ?? []).map((m) => m.from_id),
    ]),
    signedUrls(
      PHOTO_BUCKET,
      incident.photos.map((p) => p.path),
    ),
    invoiceRow?.receipt_url
      ? signedUrls(RECEIPT_BUCKET, [invoiceRow.receipt_url])
      : Promise.resolve<Record<string, string>>({}),
  ]);

  return {
    incident,
    quote: quoteRow,
    intervention: intervention?.data ?? null,
    invoice: invoiceRow,
    caseMessages: caseMessages.data ?? [],
    groupMessages,
    people,
    photoUrls,
    receiptUrl: invoiceRow?.receipt_url ? (receipt[invoiceRow.receipt_url] ?? null) : null,
  };
}

export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_settings")
    .select("approval_threshold_eur, reminder_day1, reminder_day2, ai_pricing_note")
    .maybeSingle();
  return {
    threshold: Number(data?.approval_threshold_eur ?? 1000),
    reminderDay1: data?.reminder_day1 ?? 7,
    reminderDay2: data?.reminder_day2 ?? 15,
    aiPricingNote: data?.ai_pricing_note ?? "",
  };
}
