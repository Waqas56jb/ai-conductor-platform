-- Multi-company tenancy, Supabase Auth profiles and row-level security.
--
-- Every business table gets company_id. Access for the `authenticated` role is
-- layered:
--   1. a RESTRICTIVE "same company" policy on every business table. Any later
--      permissive policy is ANDed with it, so no policy can ever cross companies;
--   2. PERMISSIVE policies per table, added only when a feature needs client
--      access (here: companies, users, settings, notifications).
-- Tables without a permissive policy stay closed: the migration runner revokes
-- their grants.

-- ---------- companies ----------

create table public.ai_conductor_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  legal_form text,
  siret text check (siret is null or siret ~ '^\d{14}$'),
  vat_number text,
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country text not null default 'France',
  phone text,
  email text,
  template_key text not null default 'btp' check (template_key in ('btp', 'immobilier', 'barber', 'entrepreneur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.ai_conductor_companies
  for each row execute function public.ai_conductor_set_updated_at();

comment on table public.ai_conductor_companies is 'Tenants: every business row belongs to exactly one company.';

-- ---------- roles ----------

alter table public.ai_conductor_users
  drop constraint ai_conductor_users_role_check,
  add constraint ai_conductor_users_role_check check (
    role in ('client', 'technician', 'manager', 'director', 'accountant', 'admin')
  );

-- ---------- 1. company_id on every business table, backfilled ----------

create temporary table _tenant_tables (name text primary key) on commit drop;
insert into _tenant_tables values
  ('ai_conductor_users'), ('ai_conductor_clients'), ('ai_conductor_technicians'),
  ('ai_conductor_managers'), ('ai_conductor_directors'), ('ai_conductor_buildings'),
  ('ai_conductor_units'), ('ai_conductor_incidents'), ('ai_conductor_tasks'),
  ('ai_conductor_task_groups'), ('ai_conductor_group_messages'),
  ('ai_conductor_incident_messages'), ('ai_conductor_quotations'),
  ('ai_conductor_interventions'), ('ai_conductor_invoices'),
  ('ai_conductor_notifications'), ('ai_conductor_feedback'), ('ai_conductor_settings'),
  ('ai_conductor_contacts'), ('ai_conductor_documents'), ('ai_conductor_payments'),
  ('ai_conductor_reminders'), ('ai_conductor_integrations'),
  ('ai_conductor_ai_conversations'), ('ai_conductor_ai_messages'),
  ('ai_conductor_ai_actions'), ('ai_conductor_audit_log');

do $$
declare
  default_company uuid;
  t record;
begin
  -- Existing rows all belonged to the single implicit company.
  insert into public.ai_conductor_companies (name)
  values ('Pratonna Gestion')
  returning id into default_company;

  for t in select name from _tenant_tables loop
    execute format(
      'alter table public.%I add column company_id uuid references public.ai_conductor_companies (id) on delete cascade',
      t.name
    );
    execute format('update public.%I set company_id = %L', t.name, default_company);
    execute format('alter table public.%I alter column company_id set not null', t.name);
    execute format('create index idx_%s_company on public.%I (company_id)', t.name, t.name);
  end loop;
end
$$;

-- One settings row per company (the old single row used the fixed id 'company').
alter table public.ai_conductor_settings
  alter column id set default gen_random_uuid()::text,
  add constraint ai_conductor_settings_company_key unique (company_id);

-- Quote references are unique per company, not globally.
alter table public.ai_conductor_quotations
  drop constraint ai_conductor_quotations_reference_key,
  add constraint ai_conductor_quotations_company_reference_key unique (company_id, reference);

-- ElevenLabs is no longer a provider (OpenAI only).
alter table public.ai_conductor_integrations
  drop constraint ai_conductor_integrations_provider_check,
  add constraint ai_conductor_integrations_provider_check check (provider in (
    'google', 'microsoft', 'whatsapp', 'yousign', 'pennylane', 'qonto', 'stripe'
  ));

-- ---------- 2. who is the current user? (Supabase Auth → profile) ----------
-- SECURITY DEFINER so policies can read the caller's profile without
-- recursing through ai_conductor_users' own policies.

create function public.ai_conductor_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.ai_conductor_users u
  where u.auth_user_id = auth.uid() and u.active
$$;

create function public.ai_conductor_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.company_id from public.ai_conductor_users u
  where u.auth_user_id = auth.uid() and u.active
$$;

create function public.ai_conductor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role from public.ai_conductor_users u
  where u.auth_user_id = auth.uid() and u.active
$$;

revoke all on function public.ai_conductor_profile_id() from public, anon;
revoke all on function public.ai_conductor_company_id() from public, anon;
revoke all on function public.ai_conductor_role() from public, anon;
grant execute on function public.ai_conductor_profile_id() to authenticated;
grant execute on function public.ai_conductor_company_id() to authenticated;
grant execute on function public.ai_conductor_role() to authenticated;

-- ---------- 3. restrictive company isolation on every business table ----------

do $$
declare
  t record;
begin
  for t in select name from _tenant_tables loop
    execute format(
      'create policy company_isolation on public.%I as restrictive for all to authenticated
         using (company_id = public.ai_conductor_company_id())
         with check (company_id = public.ai_conductor_company_id())',
      t.name
    );
  end loop;
end
$$;

-- ---------- 4. permissive access needed by Phase 1 ----------

-- Companies: members read their company; director/admin edit it.
create policy companies_select on public.ai_conductor_companies
  for select to authenticated
  using (id = public.ai_conductor_company_id());

create policy companies_update on public.ai_conductor_companies
  for update to authenticated
  using (id = public.ai_conductor_company_id() and public.ai_conductor_role() in ('director', 'admin'))
  with check (id = public.ai_conductor_company_id());

grant select on public.ai_conductor_companies to authenticated;
grant update (name, legal_form, siret, vat_number, address, postal_code, city, country, phone, email)
  on public.ai_conductor_companies to authenticated;

-- Users: colleagues are visible (minus password_hash); everyone edits only
-- their own display fields. Role / company changes go through the server.
create policy users_select on public.ai_conductor_users
  for select to authenticated
  using (true);

create policy users_update_self on public.ai_conductor_users
  for update to authenticated
  using (id = public.ai_conductor_profile_id())
  with check (id = public.ai_conductor_profile_id());

revoke all on public.ai_conductor_users from authenticated;
grant select (
  id, email, role, display_name, phone, photo_url, locale, active, company_id,
  auth_user_id, last_login_at, created_at, updated_at
) on public.ai_conductor_users to authenticated;
grant update (display_name, phone, photo_url, locale) on public.ai_conductor_users to authenticated;

-- Settings: readable by the company; director/admin edit the workflow knobs.
create policy settings_select on public.ai_conductor_settings
  for select to authenticated
  using (true);

create policy settings_update on public.ai_conductor_settings
  for update to authenticated
  using (public.ai_conductor_role() in ('director', 'admin'))
  with check (public.ai_conductor_role() in ('director', 'admin'));

grant select on public.ai_conductor_settings to authenticated;
grant update (approval_threshold_eur, reminder_day1, reminder_day2, ai_pricing_note)
  on public.ai_conductor_settings to authenticated;

-- Notifications: each user reads and marks read their own.
create policy notifications_select_own on public.ai_conductor_notifications
  for select to authenticated
  using (user_id = public.ai_conductor_profile_id());

create policy notifications_update_own on public.ai_conductor_notifications
  for update to authenticated
  using (user_id = public.ai_conductor_profile_id())
  with check (user_id = public.ai_conductor_profile_id());

grant select on public.ai_conductor_notifications to authenticated;
grant update (read) on public.ai_conductor_notifications to authenticated;
