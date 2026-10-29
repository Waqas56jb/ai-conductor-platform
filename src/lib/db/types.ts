// Hand-maintained types for the ai_conductor_* tables the app reads/writes.
// Keep in sync with db/migrations. Each phase adds the tables it uses.
import type { Role } from "@/lib/auth/roles";
import type { IncidentStatus } from "@/lib/workflows/incident";

type Timestamps = { created_at: string; updated_at: string };

export type CompanyRow = Timestamps & {
  id: string;
  name: string;
  legal_form: string | null;
  siret: string | null;
  vat_number: string | null;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  template_key: "btp" | "immobilier" | "barber" | "entrepreneur";
};

export type UserRow = Timestamps & {
  id: string;
  email: string;
  role: Role;
  display_name: string;
  phone: string | null;
  photo_url: string | null;
  locale: "fr" | "en";
  active: boolean;
  company_id: string;
  auth_user_id: string | null;
  last_login_at: string | null;
};

export type SettingsRow = {
  id: string;
  company_id: string;
  company_name: string | null;
  approval_threshold_eur: number;
  reminder_day1: number;
  reminder_day2: number;
  ai_pricing_note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: string | null;
  type: string | null;
  title: string;
  body: string | null;
  read: boolean;
  incident_id: string | null;
  task_id: string | null;
  quotation_id: string | null;
  invoice_id: string | null;
  priority: "urgent" | "important" | "digest";
  source: "email" | "call" | "meeting" | "file" | "task" | "system";
  /** Moved by the user: priority rules leave it alone. */
  priority_overridden: boolean;
  created_at: string;
};

export type Urgency = "low" | "medium" | "high";
export type Channel = "app" | "web" | "whatsapp" | "email" | "phone";

/** A stored photo: path inside the private photos bucket. */
export type PhotoRef = { path: string; kind: "report" | "site"; uploaded_by: string; at: string };

export type IncidentRow = Timestamps & {
  id: string;
  /** Human, per-company number (INC-2026-0001); `id` is the global key. */
  reference: string;
  company_id: string;
  title: string;
  description: string;
  channel: Channel;
  status: IncidentStatus;
  urgency: Urgency | null;
  client_id: string | null;
  complainant_name: string | null;
  manager_id: string | null;
  building_address: string | null;
  unit_label: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  ai_match: string | null;
  ai_summary: string | null;
  client_notes: string | null;
  photos: PhotoRef[];
  hired_tech_ids: string[];
  group_id: string | null;
  quotation_id: string | null;
  intervention_id: string | null;
  invoice_id: string | null;
  closed_at: string | null;
};

export type QuoteLine = { label: string; quantity: number; unit_price_ht: number };

export type QuotationRow = Timestamps & {
  id: string;
  company_id: string;
  reference: string;
  incident_id: string | null;
  client_id: string | null;
  tech_ids: string[];
  created_by: string | null;
  created_by_role: string | null;
  title: string;
  summary: string | null;
  diagnosis: string | null;
  line_items: QuoteLine[];
  currency: string;
  tax_rate: number;
  subtotal_ht: number;
  tax_amount: number;
  total_ttc: number;
  validity_days: number;
  approval_route: "manager" | "director";
  status:
    | "pending_manager"
    | "pending_director"
    | "sent_to_client"
    | "accepted"
    | "rejected"
    | "cancelled";
  threshold_used: number | null;
  signed_at: string | null;
};

export type InterventionRow = Timestamps & {
  id: string;
  company_id: string;
  incident_id: string | null;
  quotation_id: string | null;
  client_id: string | null;
  manager_id: string | null;
  tech_ids: string[];
  scheduled_at: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  building_address: string | null;
  notes: string | null;
};

export type InvoiceRow = Timestamps & {
  id: string;
  company_id: string;
  reference: string;
  incident_id: string | null;
  quotation_id: string | null;
  client_id: string | null;
  title: string;
  amount: number;
  currency: string;
  status: "unpaid" | "under_review" | "paid" | "overdue" | "cancelled";
  issued_at: string;
  due_at: string | null;
  reminders: { day: number; sent_at: string }[];
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  paid_at: string | null;
};

export type MessageRow = {
  id: string;
  company_id: string;
  from_id: string | null;
  from_name: string | null;
  from_role: string | null;
  text: string;
  created_at: string;
};

export type TaskGroupRow = {
  id: string;
  company_id: string;
  incident_id: string | null;
  member_ids: string[];
  created_by: string | null;
  created_at: string;
};

export type TechnicianRow = Timestamps & {
  user_id: string;
  company_id: string;
  specialty: string | null;
  experience_years: number | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  available: boolean;
  visible_to_manager: boolean;
  rating: number | null;
  jobs_completed: number | null;
  geolocated_at: string | null;
};

export type ClientRow = Timestamps & {
  user_id: string;
  company_id: string;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
};

export type FeedbackRow = {
  id: string;
  company_id: string;
  user_id: string | null;
  role: string | null;
  topic: string | null;
  rating: number | null;
  message: string | null;
  created_at: string;
};

export const THEME_COLORS = ["blue", "ocean", "violet", "emerald", "amber", "rose"] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

export const ASSISTANT_TONES = [
  "direct",
  "friendly",
  "professional",
  "motivating",
  "neutral",
] as const;
export type AssistantTone = (typeof ASSISTANT_TONES)[number];

export const ASSISTANT_VOICES = ["calm", "energetic", "neutral", "off"] as const;
export type AssistantVoice = (typeof ASSISTANT_VOICES)[number];

export const AVATAR_TYPES = ["human", "abstract", "none"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];

export type AssistantProfileRow = Timestamps & {
  user_id: string;
  company_id: string;
  display_name: string;
  tone: AssistantTone;
  language: "fr" | "en";
  avatar_type: AvatarType;
  avatar_url: string | null;
  voice: AssistantVoice;
  context_aware_tone: boolean;
  /** Null follows the company colour. */
  theme_color: ThemeColor | null;
};

export const MEMORY_KINDS = ["preference", "rule", "fact"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export type AssistantMemoryRow = Timestamps & {
  id: string;
  user_id: string;
  company_id: string;
  kind: MemoryKind;
  content: string;
  approved: boolean;
  source: "user" | "assistant";
};

export type CompanyThemeRow = Timestamps & {
  company_id: string;
  primary_color: ThemeColor;
  updated_by: string | null;
};

export type AiConversationRow = Timestamps & {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  channel: "chat" | "voice" | "email" | "whatsapp";
  model: string | null;
  archived_at: string | null;
};

/** One chat-completions message, stored as sent to / received from the model. */
export type AiMessageContent =
  | { text: string }
  | {
      text: string;
      tool_calls: { id: string; name: string; arguments: string }[];
    }
  | { tool_call_id: string; name: string; output: string };

export type AiMessageRow = {
  id: string;
  company_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: AiMessageContent;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type AiActionStatus =
  "pending" | "approved" | "rejected" | "executed" | "failed" | "expired";

export type AiActionRow = Timestamps & {
  id: string;
  company_id: string;
  conversation_id: string | null;
  user_id: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  status: AiActionStatus;
  decided_by: string | null;
  decided_at: string | null;
  executed_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  expires_at: string | null;
};

export type SignatureEvent = { status: string; at: string; source: "app" | "webhook" | "poll" };

export type SignatureRequestRow = Timestamps & {
  id: string;
  company_id: string;
  document_type: "quotation" | "contract" | "service_order";
  document_id: string;
  incident_id: string | null;
  provider: "docusign";
  envelope_id: string;
  signer_id: string | null;
  signer_email: string;
  status: "sent" | "delivered" | "completed" | "declined" | "voided";
  /** Path in the signatures bucket once completed. */
  signed_pdf_url: string | null;
  events: SignatureEvent[];
  created_by: string | null;
  completed_at: string | null;
};

export type PriorityRuleRow = Timestamps & {
  id: string;
  user_id: string;
  company_id: string;
  condition: Record<string, unknown>;
  priority: NotificationRow["priority"];
  label: string;
  approved: boolean;
  source: "user" | "assistant" | "overrides";
};

export type ReminderRow = Timestamps & {
  id: string;
  company_id: string;
  user_id: string;
  kind: "meeting" | "call" | "email" | "task" | "follow_up";
  title: string;
  notes: string;
  due_at: string;
  incident_id: string | null;
  task_id: string | null;
  quotation_id: string | null;
  invoice_id: string | null;
  channel: "in_app" | "email" | "whatsapp" | "sms";
  status: "scheduled" | "sent" | "done" | "cancelled" | "failed";
  attempts: number;
  sent_at: string | null;
  last_error: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_via: "app" | "assistant";
};

export type PushSubscriptionRow = Timestamps & {
  id: string;
  company_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      ai_conductor_companies: Table<CompanyRow, Partial<CompanyRow> & Pick<CompanyRow, "name">>;
      ai_conductor_users: Table<
        UserRow & { password_hash: string | null },
        Partial<UserRow> & Pick<UserRow, "email" | "role" | "company_id">
      >;
      ai_conductor_directors: Table<
        { user_id: string; company_id: string; title: string | null } & Timestamps,
        { user_id: string; company_id: string; title?: string | null }
      >;
      ai_conductor_settings: Table<
        SettingsRow,
        Partial<SettingsRow> & Pick<SettingsRow, "company_id">
      >;
      ai_conductor_notifications: Table<
        NotificationRow,
        Partial<NotificationRow> & Pick<NotificationRow, "company_id" | "user_id" | "title">
      >;
      ai_conductor_incidents: Table<
        IncidentRow,
        Partial<IncidentRow> & Pick<IncidentRow, "id" | "reference" | "company_id" | "title">
      >;
      ai_conductor_quotations: Table<
        QuotationRow,
        Partial<QuotationRow> & Pick<QuotationRow, "id" | "reference" | "company_id">
      >;
      ai_conductor_interventions: Table<
        InterventionRow,
        Partial<InterventionRow> & Pick<InterventionRow, "id" | "company_id">
      >;
      ai_conductor_invoices: Table<
        InvoiceRow,
        Partial<InvoiceRow> & Pick<InvoiceRow, "id" | "reference" | "company_id">
      >;
      ai_conductor_incident_messages: Table<
        MessageRow & { incident_id: string },
        Partial<MessageRow> & { incident_id: string; company_id: string; text: string }
      >;
      ai_conductor_task_groups: Table<
        TaskGroupRow,
        Partial<TaskGroupRow> & Pick<TaskGroupRow, "id" | "company_id">
      >;
      ai_conductor_group_messages: Table<
        MessageRow & { group_id: string },
        Partial<MessageRow> & { group_id: string; company_id: string; text: string }
      >;
      ai_conductor_technicians: Table<
        TechnicianRow,
        Partial<TechnicianRow> & Pick<TechnicianRow, "user_id" | "company_id">
      >;
      ai_conductor_clients: Table<
        ClientRow,
        Partial<ClientRow> & Pick<ClientRow, "user_id" | "company_id">
      >;
      ai_conductor_managers: Table<
        { user_id: string; company_id: string; title: string | null } & Timestamps,
        { user_id: string; company_id: string; title?: string | null }
      >;
      ai_conductor_audit_log: Table<
        {
          id: number;
          company_id: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          data: Record<string, unknown>;
          created_at: string;
        },
        {
          company_id: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          data?: Record<string, unknown>;
        }
      >;
      ai_conductor_feedback: Table<
        FeedbackRow,
        Partial<FeedbackRow> & Pick<FeedbackRow, "company_id">
      >;
      ai_conductor_assistant_profiles: Table<
        AssistantProfileRow,
        Partial<AssistantProfileRow> & Pick<AssistantProfileRow, "user_id" | "company_id">
      >;
      ai_conductor_assistant_memories: Table<
        AssistantMemoryRow,
        Partial<AssistantMemoryRow> &
          Pick<AssistantMemoryRow, "user_id" | "company_id" | "kind" | "content">
      >;
      ai_conductor_signature_requests: Table<
        SignatureRequestRow,
        Partial<SignatureRequestRow> &
          Pick<
            SignatureRequestRow,
            "company_id" | "document_type" | "document_id" | "envelope_id" | "signer_email"
          >
      >;
      ai_conductor_priority_rules: Table<
        PriorityRuleRow,
        Partial<PriorityRuleRow> &
          Pick<PriorityRuleRow, "user_id" | "company_id" | "condition" | "priority" | "label">
      >;
      ai_conductor_reminders: Table<
        ReminderRow,
        Partial<ReminderRow> &
          Pick<ReminderRow, "company_id" | "user_id" | "kind" | "title" | "due_at">
      >;
      ai_conductor_push_subscriptions: Table<
        PushSubscriptionRow,
        Partial<PushSubscriptionRow> &
          Pick<PushSubscriptionRow, "company_id" | "user_id" | "endpoint" | "p256dh" | "auth">
      >;
      ai_conductor_company_themes: Table<
        CompanyThemeRow,
        Partial<CompanyThemeRow> & Pick<CompanyThemeRow, "company_id">
      >;
      ai_conductor_ai_conversations: Table<
        AiConversationRow,
        Partial<AiConversationRow> & Pick<AiConversationRow, "company_id" | "user_id">
      >;
      ai_conductor_ai_messages: Table<
        AiMessageRow,
        Partial<AiMessageRow> &
          Pick<AiMessageRow, "company_id" | "conversation_id" | "role" | "content">
      >;
      ai_conductor_ai_actions: Table<
        AiActionRow,
        Partial<AiActionRow> & Pick<AiActionRow, "company_id" | "user_id" | "tool">
      >;
    };
    Views: Record<never, never>;
    Functions: {
      ai_conductor_next_number: {
        Args: { company: string; counter_kind: "devis" | "facture" | "incident" };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
