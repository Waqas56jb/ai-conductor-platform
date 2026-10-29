-- Feedback round 1 (E): smart notifications, reminders and web push.
--
-- Notifications get a priority (urgent / important / digest) and a source.
-- Priority rules are the user's own; a rule suggested by the assistant (or
-- inferred from manual overrides) is stored unapproved and never applied until
-- the user accepts it. Reminders fire from a cron job, in-app and by web push.

-- ---------- notifications: priority & source ----------

alter table public.ai_conductor_notifications
  add column priority text not null default 'important'
    check (priority in ('urgent', 'important', 'digest')),
  add column source text not null default 'system'
    check (source in ('email', 'call', 'meeting', 'file', 'task', 'system')),
  -- Set when the user moved the item by hand; rules never override it.
  add column priority_overridden boolean not null default false;

create index if not exists idx_ai_conductor_notifications_user_priority
  on public.ai_conductor_notifications (user_id, priority, created_at desc);

-- ---------- priority rules ----------

create table public.ai_conductor_priority_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  -- { "type"?: notification type, "source"?: source, "keyword"?: text in title/body }
  condition jsonb not null check (jsonb_typeof(condition) = 'object' and condition <> '{}'::jsonb),
  priority text not null check (priority in ('urgent', 'important', 'digest')),
  -- Human wording of the rule, shown when it is suggested.
  label text not null check (char_length(btrim(label)) between 1 and 300),
  approved boolean not null default false,
  source text not null default 'user' check (source in ('user', 'assistant', 'overrides')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_priority_rules_user
  on public.ai_conductor_priority_rules (user_id, approved);
create index idx_ai_conductor_priority_rules_company
  on public.ai_conductor_priority_rules (company_id);

create trigger set_updated_at before update on public.ai_conductor_priority_rules
  for each row execute function public.ai_conductor_set_updated_at();

-- ---------- reminders ----------
-- The Phase 1 scaffold table (empty, company-isolated since 0004) becomes the
-- generic reminder: meetings, calls, emails, tasks and follow-ups, optionally
-- about a case, a quote or an invoice. due_at is when it fires.

alter table public.ai_conductor_reminders
  drop constraint ai_conductor_reminders_kind_check,
  add constraint ai_conductor_reminders_kind_check
    check (kind in ('meeting', 'call', 'email', 'task', 'follow_up')),
  drop constraint ai_conductor_reminders_status_check,
  add constraint ai_conductor_reminders_status_check
    check (status in ('scheduled', 'sent', 'done', 'cancelled', 'failed')),
  alter column user_id set not null,
  add column title text not null check (char_length(btrim(title)) between 1 and 200),
  add column notes text not null default '' check (char_length(notes) <= 1000),
  add column created_via text not null default 'app' check (created_via in ('app', 'assistant'));

create index if not exists idx_ai_conductor_reminders_user_due
  on public.ai_conductor_reminders (user_id, due_at);

-- ---------- web push subscriptions ----------

create table public.ai_conductor_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_push_subscriptions_user
  on public.ai_conductor_push_subscriptions (user_id);
create index idx_ai_conductor_push_subscriptions_company
  on public.ai_conductor_push_subscriptions (company_id);

create trigger set_updated_at before update on public.ai_conductor_push_subscriptions
  for each row execute function public.ai_conductor_set_updated_at();

-- ---------- access: each user reads their own; writes go through the server ----------

do $$
declare
  t text;
begin
  foreach t in array array['ai_conductor_priority_rules', 'ai_conductor_push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy company_isolation on public.%I as restrictive for all to authenticated
         using (company_id = public.ai_conductor_company_id())
         with check (company_id = public.ai_conductor_company_id())', t);
  end loop;
  foreach t in array array[
    'ai_conductor_priority_rules', 'ai_conductor_reminders', 'ai_conductor_push_subscriptions'
  ]
  loop
    execute format(
      'create policy own_rows_select on public.%I for select to authenticated
         using (user_id = public.ai_conductor_profile_id())', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;

alter publication supabase_realtime add table public.ai_conductor_reminders;
