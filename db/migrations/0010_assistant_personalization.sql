-- Feedback round 1 (C1): assistant personalisation.
--
-- The Phase 3 per-user agent profile becomes the assistant profile: a name
-- (default "Maya"), an avatar, a voice, a wider set of tones, a context-aware
-- tone switch and a workspace colour. Free-text instructions become approved
-- "rule" memories, so everything the assistant remembers lives in one place and
-- only approved memories ever reach the model. Companies get a default colour.

alter table public.ai_conductor_agent_profiles rename to ai_conductor_assistant_profiles;
alter index public.idx_ai_conductor_agent_profiles_company
  rename to idx_ai_conductor_assistant_profiles_company;
alter policy agent_profiles_select on public.ai_conductor_assistant_profiles
  rename to assistant_profiles_select;

alter table public.ai_conductor_assistant_profiles rename column assistant_name to display_name;
alter table public.ai_conductor_assistant_profiles
  drop constraint if exists ai_conductor_agent_profiles_assistant_name_check,
  drop constraint if exists ai_conductor_agent_profiles_tone_check,
  drop constraint if exists ai_conductor_agent_profiles_language_check,
  drop constraint if exists ai_conductor_agent_profiles_instructions_check;

update public.ai_conductor_assistant_profiles set display_name = 'Maya' where display_name = 'Pratonna';
update public.ai_conductor_assistant_profiles set tone = 'direct' where tone = 'concise';

alter table public.ai_conductor_assistant_profiles
  alter column display_name set default 'Maya',
  add constraint ai_conductor_assistant_profiles_name_check
    check (char_length(btrim(display_name)) between 1 and 40),
  add constraint ai_conductor_assistant_profiles_tone_check
    check (tone in ('direct', 'friendly', 'professional', 'motivating', 'neutral')),
  add constraint ai_conductor_assistant_profiles_language_check check (language in ('fr', 'en')),
  add column avatar_type text not null default 'human'
    check (avatar_type in ('human', 'abstract', 'none')),
  -- Reserved for an uploaded picture: a site-relative path or an https URL.
  add column avatar_url text check (avatar_url is null or avatar_url ~ '^(/|https://)'),
  add column voice text not null default 'calm' check (voice in ('calm', 'energetic', 'neutral', 'off')),
  add column context_aware_tone boolean not null default true,
  -- Null follows the company colour.
  add column theme_color text
    check (theme_color in ('blue', 'ocean', 'violet', 'emerald', 'amber', 'rose'));

-- ---------- memories & rules ----------

create table public.ai_conductor_assistant_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  kind text not null check (kind in ('preference', 'rule', 'fact')),
  content text not null check (char_length(btrim(content)) between 1 and 500),
  -- Suggested by the assistant until the user approves it; only approved ones are used.
  approved boolean not null default false,
  source text not null default 'user' check (source in ('user', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_assistant_memories_user
  on public.ai_conductor_assistant_memories (user_id, created_at desc);
create index idx_ai_conductor_assistant_memories_company
  on public.ai_conductor_assistant_memories (company_id);

create trigger set_updated_at before update on public.ai_conductor_assistant_memories
  for each row execute function public.ai_conductor_set_updated_at();

insert into public.ai_conductor_assistant_memories (user_id, company_id, kind, content, approved, source)
select user_id, company_id, 'rule', left(btrim(instructions), 500), true, 'user'
from public.ai_conductor_assistant_profiles
where btrim(instructions) <> '';

alter table public.ai_conductor_assistant_profiles drop column instructions;

-- ---------- company colour ----------

create table public.ai_conductor_company_themes (
  company_id uuid primary key references public.ai_conductor_companies (id) on delete cascade,
  primary_color text not null default 'blue'
    check (primary_color in ('blue', 'ocean', 'violet', 'emerald', 'amber', 'rose')),
  updated_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.ai_conductor_company_themes
  for each row execute function public.ai_conductor_set_updated_at();

-- ---------- access: own memories, the company's colour; writes go through the server ----------

alter table public.ai_conductor_assistant_memories enable row level security;
alter table public.ai_conductor_company_themes enable row level security;

create policy company_isolation on public.ai_conductor_assistant_memories as restrictive for all to authenticated
  using (company_id = public.ai_conductor_company_id())
  with check (company_id = public.ai_conductor_company_id());
create policy company_isolation on public.ai_conductor_company_themes as restrictive for all to authenticated
  using (company_id = public.ai_conductor_company_id())
  with check (company_id = public.ai_conductor_company_id());

create policy assistant_memories_select on public.ai_conductor_assistant_memories
  for select to authenticated
  using (user_id = public.ai_conductor_profile_id());
create policy company_themes_select on public.ai_conductor_company_themes
  for select to authenticated
  using (true);

do $$
declare
  t text;
begin
  foreach t in array array['ai_conductor_assistant_memories', 'ai_conductor_company_themes']
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
