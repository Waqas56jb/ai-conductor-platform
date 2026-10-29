-- Phase 2: the core incident workflow, shared by the four role panels.
--
-- Reads go through the signed-in user's client (RLS below); every write goes
-- through server actions that check the incident state machine
-- (src/lib/workflows/incident.ts) and use the service role. So this migration
-- only adds SELECT policies, plus the grants Realtime needs.

-- ---------- role helpers ----------

create function public.ai_conductor_is_office()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.ai_conductor_role() in ('manager', 'director', 'admin'), false)
$$;

create function public.ai_conductor_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.ai_conductor_role() in ('manager', 'director', 'admin', 'accountant'), false)
$$;

-- Can the caller see this incident? Office/accounting: all; client: own; technician: assigned.
create function public.ai_conductor_can_see_incident(incident text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ai_conductor_incidents i
    where i.id = incident
      and i.company_id = public.ai_conductor_company_id()
      and (
        public.ai_conductor_is_staff()
        or i.client_id = public.ai_conductor_profile_id()
        or public.ai_conductor_profile_id() = any (i.hired_tech_ids)
      )
  )
$$;

do $$
declare
  f text;
begin
  foreach f in array array['ai_conductor_is_office', 'ai_conductor_is_staff'] loop
    execute format('revoke all on function public.%I() from public, anon', f);
    execute format('grant execute on function public.%I() to authenticated', f);
  end loop;
end
$$;
revoke all on function public.ai_conductor_can_see_incident(text) from public, anon;
grant execute on function public.ai_conductor_can_see_incident(text) to authenticated;

-- ---------- per-company sequential numbering (quotes, invoices) ----------
-- French invoices must be numbered in an unbroken sequence; the counter row is
-- locked by the upsert, so concurrent calls never get the same number.

create table public.ai_conductor_counters (
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  kind text not null check (kind in ('devis', 'facture', 'incident')),
  year integer not null,
  value integer not null default 0 check (value >= 0),
  primary key (company_id, kind, year)
);

create function public.ai_conductor_next_number(company uuid, counter_kind text)
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.ai_conductor_counters as c (company_id, kind, year, value)
  values (company, counter_kind, extract(year from now())::int, 1)
  on conflict (company_id, kind, year) do update set value = c.value + 1
  returning value
$$;

revoke all on table public.ai_conductor_counters from anon, authenticated;
revoke all on function public.ai_conductor_next_number(uuid, text) from public, anon, authenticated;

-- ---------- columns the panels need ----------

alter table public.ai_conductor_incidents
  add column if not exists description text not null default '',
  add column if not exists closed_at timestamptz;

alter table public.ai_conductor_invoices
  add column if not exists reference text,
  add column if not exists paid_at timestamptz,
  add constraint ai_conductor_invoices_company_reference_key unique (company_id, reference);

alter table public.ai_conductor_technicians
  add column if not exists geolocated_at timestamptz;

create index if not exists idx_ai_conductor_incidents_company_status
  on public.ai_conductor_incidents (company_id, status, created_at desc);

-- ---------- read policies ----------

-- Incidents
create policy incidents_select on public.ai_conductor_incidents
  for select to authenticated
  using (
    public.ai_conductor_is_staff()
    or client_id = public.ai_conductor_profile_id()
    or public.ai_conductor_profile_id() = any (hired_tech_ids)
  );

-- Everything hanging off an incident follows the incident's visibility.
create policy quotations_select on public.ai_conductor_quotations
  for select to authenticated
  using (public.ai_conductor_can_see_incident(incident_id));

create policy interventions_select on public.ai_conductor_interventions
  for select to authenticated
  using (public.ai_conductor_can_see_incident(incident_id));

create policy invoices_select on public.ai_conductor_invoices
  for select to authenticated
  using (public.ai_conductor_is_staff() or client_id = public.ai_conductor_profile_id());

create policy incident_messages_select on public.ai_conductor_incident_messages
  for select to authenticated
  using (public.ai_conductor_can_see_incident(incident_id));

-- Team group chats: office and the technicians on the case — never the client.
create policy task_groups_select on public.ai_conductor_task_groups
  for select to authenticated
  using (public.ai_conductor_is_office() or public.ai_conductor_profile_id() = any (member_ids));

create policy group_messages_select on public.ai_conductor_group_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_conductor_task_groups g
      where g.id = group_id
        and (public.ai_conductor_is_office() or public.ai_conductor_profile_id() = any (g.member_ids))
    )
  );

-- Technician profiles: the team sees all; a client sees the technicians on their cases.
create policy technicians_select on public.ai_conductor_technicians
  for select to authenticated
  using (
    public.ai_conductor_role() <> 'client'
    or exists (
      select 1 from public.ai_conductor_incidents i
      where i.client_id = public.ai_conductor_profile_id() and user_id = any (i.hired_tech_ids)
    )
  );

-- Client details: office and the client themself.
create policy clients_select on public.ai_conductor_clients
  for select to authenticated
  using (public.ai_conductor_is_staff() or user_id = public.ai_conductor_profile_id());

create policy feedback_select on public.ai_conductor_feedback
  for select to authenticated
  using (public.ai_conductor_is_office() or user_id = public.ai_conductor_profile_id());

-- ---------- grants (SELECT only; writes go through the server) ----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_conductor_incidents', 'ai_conductor_quotations', 'ai_conductor_interventions',
    'ai_conductor_invoices', 'ai_conductor_incident_messages', 'ai_conductor_task_groups',
    'ai_conductor_group_messages', 'ai_conductor_technicians', 'ai_conductor_clients',
    'ai_conductor_feedback'
  ] loop
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;

-- ---------- Realtime: live lists, chats and notifications ----------
-- RLS above decides which changes each subscriber receives.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_conductor_incidents', 'ai_conductor_incident_messages', 'ai_conductor_group_messages',
    'ai_conductor_notifications', 'ai_conductor_quotations', 'ai_conductor_invoices'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ---------- Storage: private buckets, accessed only through signed URLs ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ai-conductor-photos', 'ai-conductor-photos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('ai-conductor-receipts', 'ai-conductor-receipts', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
