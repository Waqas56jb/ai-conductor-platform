-- Phase 3: AI text assistant.
--
-- Conversations, messages and approval-gated actions already exist (0003, with
-- company_id and isolation from 0004). This adds the per-user agent profile and
-- lets each user read their own assistant history. Writes go through the server.

create table public.ai_conductor_agent_profiles (
  user_id uuid primary key references public.ai_conductor_users (id) on delete cascade,
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  assistant_name text not null default 'Pratonna' check (char_length(assistant_name) between 1 and 40),
  tone text not null default 'professional' check (tone in ('professional', 'friendly', 'concise')),
  language text not null default 'fr' check (language in ('fr', 'en')),
  instructions text not null default '' check (char_length(instructions) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_agent_profiles_company on public.ai_conductor_agent_profiles (company_id);

create trigger set_updated_at before update on public.ai_conductor_agent_profiles
  for each row execute function public.ai_conductor_set_updated_at();

alter table public.ai_conductor_agent_profiles enable row level security;

create policy company_isolation on public.ai_conductor_agent_profiles as restrictive for all to authenticated
  using (company_id = public.ai_conductor_company_id())
  with check (company_id = public.ai_conductor_company_id());

-- ---------- read access: each user sees only their own assistant ----------

create policy agent_profiles_select on public.ai_conductor_agent_profiles
  for select to authenticated
  using (user_id = public.ai_conductor_profile_id());

create policy ai_conversations_select on public.ai_conductor_ai_conversations
  for select to authenticated
  using (user_id = public.ai_conductor_profile_id());

create policy ai_messages_select on public.ai_conductor_ai_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_conductor_ai_conversations c
      where c.id = conversation_id and c.user_id = public.ai_conductor_profile_id()
    )
  );

create policy ai_actions_select on public.ai_conductor_ai_actions
  for select to authenticated
  using (user_id = public.ai_conductor_profile_id());

-- Pending proposals are listed per conversation.
create index if not exists idx_ai_conductor_ai_actions_user_status
  on public.ai_conductor_ai_actions (user_id, status, created_at desc);

-- ---------- grants (SELECT only) ----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_conductor_agent_profiles', 'ai_conductor_ai_conversations',
    'ai_conductor_ai_messages', 'ai_conductor_ai_actions'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
