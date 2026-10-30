-- Phase 6: accounting. Payments against invoices (several per invoice) and the
-- review of receipts sent by clients; service orders that go through an
-- approval chain (draft → funds_check → accountant_review → esign → sent),
-- with every decision kept in an append-only log; what the reports need to
-- measure the quote conversion. Writes go through the server, as before.

alter table public.ai_conductor_counters
  drop constraint if exists ai_conductor_counters_kind_check,
  add constraint ai_conductor_counters_kind_check
    check (kind in ('devis', 'facture', 'incident', 'contrat', 'ordre_service'));

-- ---------- payments ----------

alter table public.ai_conductor_payments
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'receipt', 'bank')),
  add column if not exists created_by uuid references public.ai_conductor_users (id) on delete set null;

create index if not exists idx_ai_conductor_payments_created_by on public.ai_conductor_payments (created_by);
create index if not exists idx_ai_conductor_payments_company_paid
  on public.ai_conductor_payments (company_id, paid_at desc);

alter table public.ai_conductor_payments enable row level security;

-- Accounting and the office see every payment; a client sees those of their invoices.
create policy payments_select on public.ai_conductor_payments
  for select to authenticated
  using (
    public.ai_conductor_is_staff()
    or exists (
      select 1 from public.ai_conductor_invoices i
      where i.id = invoice_id and i.client_id = public.ai_conductor_profile_id()
    )
  );

revoke all on public.ai_conductor_payments from anon, authenticated;
grant select on public.ai_conductor_payments to authenticated;

-- Why the last receipt was refused (shown to the client).
alter table public.ai_conductor_invoices
  add column if not exists receipt_note text not null default ''
    check (char_length(receipt_note) <= 500);

-- ---------- quotes: when they reached the client, and whether the client declined ----------
-- "rejected" covers both a refusal by the office and by the client; the
-- conversion rate only counts what the client saw.

alter table public.ai_conductor_quotations
  add column if not exists sent_at timestamptz,
  add column if not exists client_declined_at timestamptz;

update public.ai_conductor_quotations q
set sent_at = coalesce(q.signed_at, q.updated_at)
where q.sent_at is null and q.status in ('sent_to_client', 'accepted', 'invoiced');

update public.ai_conductor_quotations q
set client_declined_at = a.created_at, sent_at = coalesce(q.sent_at, a.created_at)
from public.ai_conductor_audit_log a
where q.status = 'rejected'
  and q.client_declined_at is null
  and a.action = 'incident.client_decline'
  and a.entity_id = q.incident_id;

-- ---------- service orders (ordres de service) ----------

create table public.ai_conductor_service_orders (
  id text primary key,
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  reference text not null,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 8000),
  supplier_name text not null check (char_length(btrim(supplier_name)) between 1 and 200),
  supplier_email text not null check (supplier_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  supplier_siret text check (supplier_siret is null or supplier_siret ~ '^\d{14}$'),
  start_date date not null,
  end_date date,
  amount_ht numeric(12, 2) not null check (amount_ht > 0),
  tax_rate numeric(4, 2) not null default 20 check (tax_rate in (0, 5.5, 10, 20)),
  total_ttc numeric(12, 2) not null check (total_ttc >= amount_ht),
  status text not null default 'draft' check (status in (
    'draft', 'funds_check', 'accountant_review', 'esign', 'sent', 'cancelled'
  )),
  signed_by uuid references public.ai_conductor_users (id) on delete set null,
  signed_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reference),
  check (end_date is null or end_date >= start_date)
);

create index idx_ai_conductor_service_orders_company
  on public.ai_conductor_service_orders (company_id, status, created_at desc);
create index idx_ai_conductor_service_orders_incident on public.ai_conductor_service_orders (incident_id);
create index idx_ai_conductor_service_orders_created_by on public.ai_conductor_service_orders (created_by);
create index idx_ai_conductor_service_orders_signed_by on public.ai_conductor_service_orders (signed_by);

-- ---------- approval chain: one row per decision, never updated ----------

create table public.ai_conductor_approval_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('service_order')),
  entity_id text not null,
  from_status text not null,
  to_status text not null,
  decision text not null check (decision in ('submit', 'approve', 'reject', 'sign', 'cancel')),
  actor_id uuid references public.ai_conductor_users (id) on delete set null,
  actor_role text not null,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index idx_ai_conductor_approval_steps_entity
  on public.ai_conductor_approval_steps (entity_type, entity_id, created_at);
create index idx_ai_conductor_approval_steps_actor on public.ai_conductor_approval_steps (actor_id);

create trigger set_updated_at before update on public.ai_conductor_service_orders
  for each row execute function public.ai_conductor_set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array['ai_conductor_service_orders', 'ai_conductor_approval_steps']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy company_isolation on public.%I as restrictive for all to authenticated
         using (company_id = public.ai_conductor_company_id())
         with check (company_id = public.ai_conductor_company_id())', t);
    -- The office and accounting: never clients or technicians.
    execute format(
      'create policy staff_select on public.%I for select to authenticated
         using (public.ai_conductor_is_staff())', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;

alter publication supabase_realtime add table public.ai_conductor_service_orders;
alter publication supabase_realtime add table public.ai_conductor_payments;
