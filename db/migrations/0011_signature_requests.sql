-- Feedback round 1 (D2): electronic signatures through DocuSign.
--
-- One row per envelope sent for signature. Quotes today; contracts and
-- service orders use the same table when they ship. Events from the DocuSign
-- Connect webhook are appended to `events`; a completed envelope's signed PDF
-- is copied to the private signatures bucket.

create table public.ai_conductor_signature_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ai_conductor_companies (id) on delete cascade,
  document_type text not null check (document_type in ('quotation', 'contract', 'service_order')),
  document_id text not null,
  incident_id text references public.ai_conductor_incidents (id) on delete set null,
  provider text not null default 'docusign' check (provider in ('docusign')),
  envelope_id text not null unique,
  signer_id uuid references public.ai_conductor_users (id) on delete set null,
  signer_email text not null,
  status text not null default 'sent'
    check (status in ('sent', 'delivered', 'completed', 'declined', 'voided')),
  -- Path in the ai-conductor-signatures bucket, once completed.
  signed_pdf_url text,
  events jsonb not null default '[]'::jsonb,
  created_by uuid references public.ai_conductor_users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conductor_signature_requests_document
  on public.ai_conductor_signature_requests (document_type, document_id, created_at desc);
create index idx_ai_conductor_signature_requests_company
  on public.ai_conductor_signature_requests (company_id);
create index idx_ai_conductor_signature_requests_signer
  on public.ai_conductor_signature_requests (signer_id);

create trigger set_updated_at before update on public.ai_conductor_signature_requests
  for each row execute function public.ai_conductor_set_updated_at();

-- ---------- access: the signer and the office read; writes go through the server ----------

alter table public.ai_conductor_signature_requests enable row level security;

create policy company_isolation on public.ai_conductor_signature_requests as restrictive for all to authenticated
  using (company_id = public.ai_conductor_company_id())
  with check (company_id = public.ai_conductor_company_id());

create policy signature_requests_select on public.ai_conductor_signature_requests
  for select to authenticated
  using (
    signer_id = public.ai_conductor_profile_id()
    or public.ai_conductor_role() in ('manager', 'director', 'admin', 'accountant')
  );

revoke all on public.ai_conductor_signature_requests from anon, authenticated;
grant select on public.ai_conductor_signature_requests to authenticated;

-- Live status in the client's quotes page.
alter publication supabase_realtime add table public.ai_conductor_signature_requests;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-conductor-signatures', 'ai-conductor-signatures', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;
