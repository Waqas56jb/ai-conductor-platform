-- Case numbers are per company (INC-2026-0001 restarts for each company) but
-- ai_conductor_incidents.id is a global primary key: two companies collided on
-- their first case. Keep a random unique id for keys/URLs and store the
-- human number in `reference`, unique per company (like quotations/invoices).

alter table public.ai_conductor_incidents add column reference text;
update public.ai_conductor_incidents set reference = id where reference is null;
alter table public.ai_conductor_incidents
  alter column reference set not null,
  add constraint ai_conductor_incidents_company_reference_key unique (company_id, reference);

-- Quotes and invoices already have a per-company reference; make it mandatory.
update public.ai_conductor_quotations set reference = id where reference is null;
alter table public.ai_conductor_quotations alter column reference set not null;
update public.ai_conductor_invoices set reference = id where reference is null;
alter table public.ai_conductor_invoices alter column reference set not null;
