-- New tables for the rebuild roadmap (PRATONNA_AUDIT.md §6):
-- audit trail, CRM contacts, documents, payments, reminders, third-party
-- integrations, and the AI assistant (conversations + approval-gated actions).
-- RLS and grant lockdown are applied by the migration runner.

-- ---------- audit log (every mutation, including AI actions) ----------

create table public.ai_conductor_audit_log (
  id bigint generated always as identity primary key,
  -- No foreign key: audit rows must survive user deletion (RGPD erasure).
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_ai_conductor_audit_log_entity on public.ai_conductor_audit_log (entity_type, entity_id);
create index idx_ai_conductor_audit_log_actor on public.ai_conductor_audit_log (actor_id, created_at desc);
create index idx_ai_conductor_audit_log_created on public.ai_conductor_audit_log (created_at desc);

-- ---------- CRM contacts ----------

create table public.ai_conductor_contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'person' check (kind in ('person', 'company')),
  full_name text not null,
  company_name text default '',
  role_title text default '',
  email text,
  phone text,
  address text default '',
  city text default '',
  country text default 'France',
  building_id uuid references public.ai_conductor_buildings (id) on delete set null,
  user_id uuid references public.ai_conductor_users (id) on delete set null,
  owner_id uuid references public.ai_conductor_users (id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'app', 'email', 'whatsapp', 'phone', 'import')),
  tags text[] not null default '{}',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_contacts_email on public.ai_conductor_contacts (lower(email));
create index idx_ai_conductor_contacts_building on public.ai_conductor_contacts (building_id);
create index idx_ai_conductor_contacts_user on public.ai_conductor_contacts (user_id);
create index idx_ai_conductor_contacts_owner on public.ai_conductor_contacts (owner_id);
create index idx_ai_conductor_contacts_tags on public.ai_conductor_contacts using gin (tags);

-- ---------- documents (devis, factures, contrats… stored in Supabase Storage) ----------

create table public.ai_conductor_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'devis', 'facture', 'contrat', 'ordre_de_service', 'rapport', 'photo', 'receipt', 'other'
  )),
  title text not null default '',
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  quotation_id text references public.ai_conductor_quotations (id) on delete set null,
  invoice_id text references public.ai_conductor_invoices (id) on delete set null,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  checksum_sha256 text,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'final', 'sent', 'signed', 'archived')),
  signature_provider text,
  signature_request_id text,
  signed_at timestamptz,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index idx_ai_conductor_documents_incident on public.ai_conductor_documents (incident_id);
create index idx_ai_conductor_documents_quotation on public.ai_conductor_documents (quotation_id);
create index idx_ai_conductor_documents_invoice on public.ai_conductor_documents (invoice_id);
create index idx_ai_conductor_documents_created_by on public.ai_conductor_documents (created_by);
create index idx_ai_conductor_documents_kind on public.ai_conductor_documents (kind, created_at desc);

-- ---------- payments (one invoice can be paid in several parts) ----------

create table public.ai_conductor_payments (
  id uuid primary key default gen_random_uuid(),
  -- Restrict: financial history must not disappear with its invoice.
  invoice_id text not null references public.ai_conductor_invoices (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  method text not null default 'transfer' check (method in (
    'transfer', 'sepa_debit', 'card', 'cheque', 'cash', 'other'
  )),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reference text,
  paid_at timestamptz,
  receipt_document_id uuid references public.ai_conductor_documents (id) on delete set null,
  verified_by uuid references public.ai_conductor_users (id) on delete set null,
  verified_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_payments_invoice on public.ai_conductor_payments (invoice_id);
create index idx_ai_conductor_payments_receipt on public.ai_conductor_payments (receipt_document_id);
create index idx_ai_conductor_payments_verified_by on public.ai_conductor_payments (verified_by);

-- ---------- reminders / scheduled follow-ups ----------

create table public.ai_conductor_reminders (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invoice', 'quotation', 'task', 'follow_up', 'custom')),
  user_id uuid references public.ai_conductor_users (id) on delete cascade,
  incident_id text references public.ai_conductor_incidents (id) on delete cascade,
  task_id text references public.ai_conductor_tasks (id) on delete cascade,
  quotation_id text references public.ai_conductor_quotations (id) on delete cascade,
  invoice_id text references public.ai_conductor_invoices (id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'whatsapp', 'sms')),
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  sent_at timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The scheduler only ever scans pending reminders that are due.
create index idx_ai_conductor_reminders_due on public.ai_conductor_reminders (due_at) where status = 'scheduled';
create index idx_ai_conductor_reminders_user on public.ai_conductor_reminders (user_id);
create index idx_ai_conductor_reminders_incident on public.ai_conductor_reminders (incident_id);
create index idx_ai_conductor_reminders_task on public.ai_conductor_reminders (task_id);
create index idx_ai_conductor_reminders_quotation on public.ai_conductor_reminders (quotation_id);
create index idx_ai_conductor_reminders_invoice on public.ai_conductor_reminders (invoice_id);
create index idx_ai_conductor_reminders_created_by on public.ai_conductor_reminders (created_by);

-- ---------- third-party integrations (Gmail, Outlook, WhatsApp…) ----------

create table public.ai_conductor_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  provider text not null check (provider in (
    'google', 'microsoft', 'whatsapp', 'elevenlabs', 'yousign', 'pennylane', 'qonto', 'stripe'
  )),
  account_email text not null default '',
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked', 'error')),
  scopes text[] not null default '{}',
  -- Encrypted by the app with ENCRYPTION_KEY before insert; never stored in clear.
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, account_email)
);

-- ---------- AI assistant ----------

create table public.ai_conductor_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  title text not null default '',
  channel text not null default 'chat' check (channel in ('chat', 'voice', 'email', 'whatsapp')),
  model text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_ai_conversations_user on public.ai_conductor_ai_conversations (user_id, updated_at desc);

create table public.ai_conductor_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conductor_ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  -- Content blocks as sent to / received from the model (text, tool_use, tool_result…).
  content jsonb not null,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index idx_ai_conductor_ai_messages_conversation on public.ai_conductor_ai_messages (conversation_id, created_at);

-- Approval gate: every write the AI proposes waits here until a human approves it.
create table public.ai_conductor_ai_actions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conductor_ai_conversations (id) on delete set null,
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  summary text not null default '',
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'executed', 'failed', 'expired'
  )),
  decided_by uuid references public.ai_conductor_users (id) on delete set null,
  decided_at timestamptz,
  executed_at timestamptz,
  result jsonb,
  error text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_ai_actions_pending on public.ai_conductor_ai_actions (user_id, created_at desc) where status = 'pending';
create index idx_ai_conductor_ai_actions_conversation on public.ai_conductor_ai_actions (conversation_id);
create index idx_ai_conductor_ai_actions_decided_by on public.ai_conductor_ai_actions (decided_by);

-- updated_at triggers for the new tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_conductor_contacts', 'ai_conductor_documents', 'ai_conductor_payments',
    'ai_conductor_reminders', 'ai_conductor_integrations', 'ai_conductor_ai_conversations',
    'ai_conductor_ai_actions'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.ai_conductor_set_updated_at()',
      t
    );
  end loop;
end
$$;

comment on table public.ai_conductor_audit_log is 'Append-only trail of every mutation, including AI actions.';
comment on table public.ai_conductor_contacts is 'CRM contacts: residents, owners, syndics, suppliers.';
comment on table public.ai_conductor_documents is 'Generated or uploaded files (devis, factures, contrats) stored in Supabase Storage.';
comment on table public.ai_conductor_payments is 'Payments received against invoices.';
comment on table public.ai_conductor_reminders is 'Scheduled reminders and follow-ups, processed by a background job.';
comment on table public.ai_conductor_integrations is 'Connected third-party accounts; tokens are encrypted by the app.';
comment on table public.ai_conductor_ai_conversations is 'AI assistant conversations per user.';
comment on table public.ai_conductor_ai_messages is 'Messages within an AI conversation.';
comment on table public.ai_conductor_ai_actions is 'Write actions proposed by the AI, executed only after human approval.';
