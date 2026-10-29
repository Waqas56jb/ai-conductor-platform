-- Baseline: the ai_conductor_* schema as it existed in Supabase on 2026-10-29,
-- captured from the live database. Every statement is IF NOT EXISTS, so this is
-- a no-op on that database and recreates the schema on a fresh one.

create extension if not exists pgcrypto;

create table if not exists public.ai_conductor_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null check (role = any (array['client', 'technician', 'manager', 'director', 'admin'])),
  display_name text not null default '',
  phone text default '',
  photo_url text default '',
  locale text default 'en',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_clients (
  user_id uuid primary key references public.ai_conductor_users (id) on delete cascade,
  address text default '',
  city text default '',
  country text default '',
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_technicians (
  user_id uuid primary key references public.ai_conductor_users (id) on delete cascade,
  age integer,
  experience_years integer default 0,
  specialty text default '',
  bio text default '',
  address text default '',
  city text default '',
  country text default '',
  lat double precision,
  lng double precision,
  available boolean not null default true,
  visible_to_manager boolean not null default true,
  hire_status text default 'available',
  rating numeric default 5.0,
  jobs_completed integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_managers (
  user_id uuid primary key references public.ai_conductor_users (id) on delete cascade,
  title text default 'Gestionnaire',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_directors (
  user_id uuid primary key references public.ai_conductor_users (id) on delete cascade,
  title text default 'Dirigeant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  address text not null default '',
  city text default '',
  country text default 'France',
  lat double precision,
  lng double precision,
  manager_id uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.ai_conductor_buildings (id) on delete cascade,
  label text not null default '',
  floor text default '',
  owner_name text default '',
  client_id uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_incidents (
  id text primary key,
  title text not null,
  channel text default 'app',
  status text not null default 'new',
  urgency text default 'medium',
  client_id uuid references public.ai_conductor_users (id) on delete set null,
  complainant_name text default '',
  manager_id uuid references public.ai_conductor_users (id) on delete set null,
  building_id uuid references public.ai_conductor_buildings (id) on delete set null,
  unit_id uuid references public.ai_conductor_units (id) on delete set null,
  building_address text default '',
  unit_label text default '',
  city text default '',
  lat double precision,
  lng double precision,
  ai_match text default '',
  ai_summary text default '',
  client_notes text default '',
  photos jsonb not null default '[]'::jsonb,
  hired_tech_ids uuid[] not null default '{}',
  group_id text,
  quotation_id text,
  intervention_id text,
  invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_tasks (
  id text primary key,
  incident_id text references public.ai_conductor_incidents (id) on delete cascade,
  group_id text,
  title text not null,
  building_address text default '',
  city text default '',
  lat double precision,
  lng double precision,
  stage text not null default 'site_visit',
  urgency text default 'medium',
  hired_tech_ids uuid[] not null default '{}',
  photos jsonb not null default '[]'::jsonb,
  notes text default '',
  quotation_id text,
  pdf_base64 text,
  pdf_file_name text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_task_groups (
  id text primary key,
  incident_id text references public.ai_conductor_incidents (id) on delete cascade,
  task_id text references public.ai_conductor_tasks (id) on delete set null,
  member_ids uuid[] not null default '{}',
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.ai_conductor_task_groups (id) on delete cascade,
  from_id uuid references public.ai_conductor_users (id) on delete set null,
  from_name text default '',
  from_role text default '',
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_incident_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.ai_conductor_incidents (id) on delete cascade,
  from_id uuid references public.ai_conductor_users (id) on delete set null,
  from_name text default '',
  from_role text default '',
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_quotations (
  id text primary key,
  reference text unique,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  task_id text references public.ai_conductor_tasks (id) on delete set null,
  client_id uuid references public.ai_conductor_users (id) on delete set null,
  tech_ids uuid[] not null default '{}',
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  created_by_role text default '',
  title text not null default '',
  summary text default '',
  diagnosis text default '',
  scope_of_work jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  currency text not null default 'EUR',
  tax_rate numeric default 20,
  subtotal_ht numeric default 0,
  tax_amount numeric default 0,
  total_ttc numeric default 0,
  validity_days integer default 30,
  estimated_duration text default '',
  urgency text default 'medium',
  confidence numeric default 0.7,
  approval_route text default 'manager',
  status text not null default 'draft',
  threshold_used numeric,
  preliminary boolean not null default false,
  pdf_base64 text,
  pdf_file_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_interventions (
  id text primary key,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  task_id text references public.ai_conductor_tasks (id) on delete set null,
  quotation_id text references public.ai_conductor_quotations (id) on delete set null,
  client_id uuid references public.ai_conductor_users (id) on delete set null,
  manager_id uuid references public.ai_conductor_users (id) on delete set null,
  tech_ids uuid[] not null default '{}',
  scheduled_at timestamptz,
  status text not null default 'planned',
  building_address text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_invoices (
  id text primary key,
  incident_id text,
  quotation_id text,
  client_id uuid references public.ai_conductor_users (id) on delete set null,
  title text not null default '',
  amount numeric not null default 0,
  currency text not null default 'EUR',
  status text not null default 'unpaid',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  reminders jsonb not null default '[]'::jsonb,
  receipt_url text,
  receipt_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_conductor_users (id) on delete cascade,
  role text default '',
  type text default '',
  title text not null default '',
  body text default '',
  read boolean not null default false,
  incident_id text,
  task_id text,
  quotation_id text,
  invoice_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.ai_conductor_users (id) on delete set null,
  role text default 'client',
  topic text default 'service',
  rating integer default 5,
  message text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conductor_settings (
  id text primary key default 'company',
  company_name text default 'Pratonna Gestion',
  approval_threshold_eur numeric not null default 1000,
  reminder_day1 integer not null default 7,
  reminder_day2 integer not null default 15,
  ai_pricing_note text default '',
  updated_by uuid references public.ai_conductor_users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conductor_incidents_client on public.ai_conductor_incidents (client_id);
create index if not exists idx_ai_conductor_incidents_status on public.ai_conductor_incidents (status);
create index if not exists idx_ai_conductor_invoices_client on public.ai_conductor_invoices (client_id);
create index if not exists idx_ai_conductor_notifications_user on public.ai_conductor_notifications (user_id, read);
create index if not exists idx_ai_conductor_quotations_status on public.ai_conductor_quotations (status);
create index if not exists idx_ai_conductor_quotations_route on public.ai_conductor_quotations (approval_route);
create index if not exists idx_ai_conductor_tasks_stage on public.ai_conductor_tasks (stage);
create index if not exists idx_ai_conductor_technicians_map on public.ai_conductor_technicians (visible_to_manager, available);
