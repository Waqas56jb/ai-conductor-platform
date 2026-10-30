-- Phase 5: contracts (sequential CTR numbers, PDF, DocuSign), team tasks,
-- meeting summaries. Email accounts reuse ai_conductor_integrations (0003):
-- tokens encrypted by the app, read and written only by the server.

alter table public.ai_conductor_counters
  drop constraint if exists ai_conductor_counters_kind_check,
  add constraint ai_conductor_counters_kind_check
    check (kind in ('devis', 'facture', 'incident', 'contrat'));

-- ---------- contracts ----------

create table public.ai_conductor_contracts (
  id text primary key,
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  reference text not null,
  client_id uuid not null references public.ai_conductor_users (id) on delete restrict,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  terms text not null default '' check (char_length(terms) <= 8000),
  start_date date not null,
  end_date date,
  billing text not null default 'one_off' check (billing in ('one_off', 'monthly', 'yearly')),
  amount_ht numeric(12, 2) not null check (amount_ht >= 0),
  tax_rate numeric(4, 2) not null default 20 check (tax_rate in (0, 5.5, 10, 20)),
  total_ttc numeric(12, 2) not null check (total_ttc >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'cancelled')),
  signed_at timestamptz,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reference),
  check (end_date is null or end_date >= start_date)
);

create index idx_ai_conductor_contracts_company on public.ai_conductor_contracts (company_id, created_at desc);
create index idx_ai_conductor_contracts_client on public.ai_conductor_contracts (client_id);
create index idx_ai_conductor_contracts_incident on public.ai_conductor_contracts (incident_id);
create index idx_ai_conductor_contracts_created_by on public.ai_conductor_contracts (created_by);

-- ---------- team tasks ----------

create table public.ai_conductor_team_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_at timestamptz,
  assignee_id uuid references public.ai_conductor_users (id) on delete set null,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  meeting_id uuid,
  source text not null default 'manual' check (source in ('manual', 'assistant', 'meeting')),
  completed_at timestamptz,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_team_tasks_company on public.ai_conductor_team_tasks (company_id, status, due_at);
create index idx_ai_conductor_team_tasks_assignee on public.ai_conductor_team_tasks (assignee_id, status);
create index idx_ai_conductor_team_tasks_created_by on public.ai_conductor_team_tasks (created_by);
create index idx_ai_conductor_team_tasks_incident on public.ai_conductor_team_tasks (incident_id);
create index idx_ai_conductor_team_tasks_meeting on public.ai_conductor_team_tasks (meeting_id);

-- ---------- meeting summaries ----------

create table public.ai_conductor_meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  held_at timestamptz not null default now(),
  participants text not null default '' check (char_length(participants) <= 1000),
  source text not null check (source in ('notes', 'audio')),
  -- What was said (notes typed in, or the transcription of the recording).
  transcript text not null check (char_length(transcript) <= 100000),
  summary text not null default '',
  -- [{ "text": "…" }]
  decisions jsonb not null default '[]'::jsonb,
  -- [{ "title": "…", "owner": "…", "due": "YYYY-MM-DD" | null }]
  actions jsonb not null default '[]'::jsonb,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_meetings_company on public.ai_conductor_meetings (company_id, held_at desc);
create index idx_ai_conductor_meetings_created_by on public.ai_conductor_meetings (created_by);
create index idx_ai_conductor_meetings_incident on public.ai_conductor_meetings (incident_id);

alter table public.ai_conductor_team_tasks
  add constraint ai_conductor_team_tasks_meeting_fkey
  foreign key (meeting_id) references public.ai_conductor_meetings (id) on delete set null;

-- ---------- timestamps, isolation, read access (writes go through the server) ----------

do $$
declare
  t text;
begin
  foreach t in array array['ai_conductor_contracts', 'ai_conductor_team_tasks', 'ai_conductor_meetings']
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.ai_conductor_set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy company_isolation on public.%I as restrictive for all to authenticated
         using (company_id = public.ai_conductor_company_id())
         with check (company_id = public.ai_conductor_company_id())', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;

-- Contracts: the office and accounting see all; a client sees their own.
create policy contracts_select on public.ai_conductor_contracts
  for select to authenticated
  using (
    client_id = public.ai_conductor_profile_id()
    or public.ai_conductor_role() in ('manager', 'director', 'admin', 'accountant')
  );

-- Tasks: the team (not clients) sees the company's tasks.
create policy team_tasks_select on public.ai_conductor_team_tasks
  for select to authenticated
  using (public.ai_conductor_role() <> 'client');

-- Meetings: the office sees all; others see the ones they wrote up.
create policy meetings_select on public.ai_conductor_meetings
  for select to authenticated
  using (
    created_by = public.ai_conductor_profile_id()
    or public.ai_conductor_role() in ('manager', 'director', 'admin')
  );

alter publication supabase_realtime add table public.ai_conductor_team_tasks;
