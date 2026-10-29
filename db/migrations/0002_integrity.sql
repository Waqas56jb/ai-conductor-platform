-- Data integrity, missing foreign keys, indexes and updated_at maintenance.
-- Checked against live data on 2026-10-29: no orphans, no duplicate emails,
-- and every existing status value is inside the allowed sets below.
--
-- Status sets include every value used by the legacy apps (legacy/*), so
-- existing writers keep working.

-- ---------- updated_at ----------

create or replace function public.ai_conductor_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and table_name like 'ai\_conductor\_%' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t.table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.ai_conductor_set_updated_at()',
      t.table_name
    );
  end loop;
end
$$;

-- ---------- users ----------

-- Prepare the move from the custom password_hash login to Supabase Auth:
-- users linked to auth.users no longer need a local hash.
alter table public.ai_conductor_users
  alter column password_hash drop not null,
  alter column locale set default 'fr',
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists last_login_at timestamptz,
  add constraint ai_conductor_users_locale_check check (locale in ('fr', 'en')),
  add constraint ai_conductor_users_email_format_check check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create unique index if not exists ai_conductor_users_email_lower_key
  on public.ai_conductor_users (lower(email));

-- ---------- allowed values ----------

alter table public.ai_conductor_incidents
  add constraint ai_conductor_incidents_status_check check (status in (
    'new', 'awaiting_assignment', 'technician_assigned', 'site_visit',
    'devis_pending_manager', 'devis_pending_director', 'approved_sent', 'sent_to_client',
    'client_signed', 'intervention_planned', 'in_progress', 'invoiced', 'closed', 'cancelled'
  )),
  add constraint ai_conductor_incidents_urgency_check check (urgency in ('low', 'medium', 'high')),
  add constraint ai_conductor_incidents_channel_check check (channel in ('app', 'web', 'whatsapp', 'email', 'phone'));

alter table public.ai_conductor_tasks
  add constraint ai_conductor_tasks_stage_check check (stage in (
    'site_visit', 'report_sent', 'awaiting_approval', 'awaiting_client_sign',
    'intervention_assigned', 'in_progress', 'completed', 'cancelled'
  )),
  add constraint ai_conductor_tasks_urgency_check check (urgency in ('low', 'medium', 'high'));

alter table public.ai_conductor_quotations
  add constraint ai_conductor_quotations_status_check check (status in (
    'draft', 'pending_approval', 'pending_manager', 'pending_director', 'approved',
    'sent_to_client', 'pending_client', 'client_signed', 'accepted', 'rejected',
    'invoiced', 'expired', 'cancelled'
  )),
  add constraint ai_conductor_quotations_route_check check (approval_route in ('manager', 'director')),
  add constraint ai_conductor_quotations_urgency_check check (urgency in ('low', 'medium', 'high')),
  add constraint ai_conductor_quotations_amounts_check check (
    subtotal_ht >= 0 and tax_amount >= 0 and total_ttc >= 0
  ),
  add constraint ai_conductor_quotations_tax_rate_check check (tax_rate between 0 and 100),
  add constraint ai_conductor_quotations_confidence_check check (confidence between 0 and 1),
  add constraint ai_conductor_quotations_validity_check check (validity_days > 0),
  add constraint ai_conductor_quotations_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.ai_conductor_interventions
  add constraint ai_conductor_interventions_status_check check (status in (
    'planned', 'in_progress', 'completed', 'cancelled'
  ));

alter table public.ai_conductor_invoices
  add constraint ai_conductor_invoices_status_check check (status in (
    'unpaid', 'awaiting_receipt', 'under_review', 'paid', 'overdue', 'cancelled'
  )),
  add constraint ai_conductor_invoices_amount_check check (amount >= 0),
  add constraint ai_conductor_invoices_currency_check check (currency ~ '^[A-Z]{3}$'),
  add constraint ai_conductor_invoices_due_check check (due_at is null or due_at >= issued_at);

alter table public.ai_conductor_technicians
  add constraint ai_conductor_technicians_hire_status_check check (hire_status in (
    'available', 'busy', 'hidden', 'unavailable'
  )),
  add constraint ai_conductor_technicians_rating_check check (rating between 0 and 5),
  add constraint ai_conductor_technicians_counts_check check (
    experience_years >= 0 and jobs_completed >= 0 and (age is null or age between 16 and 100)
  );

alter table public.ai_conductor_feedback
  add constraint ai_conductor_feedback_rating_check check (rating between 1 and 5);

alter table public.ai_conductor_settings
  add constraint ai_conductor_settings_threshold_check check (approval_threshold_eur >= 0),
  add constraint ai_conductor_settings_reminders_check check (
    reminder_day1 > 0 and reminder_day2 > reminder_day1
  );

-- ---------- missing foreign keys ----------

alter table public.ai_conductor_incidents
  add constraint ai_conductor_incidents_group_id_fkey foreign key (group_id)
    references public.ai_conductor_task_groups (id) on delete set null,
  add constraint ai_conductor_incidents_quotation_id_fkey foreign key (quotation_id)
    references public.ai_conductor_quotations (id) on delete set null,
  add constraint ai_conductor_incidents_intervention_id_fkey foreign key (intervention_id)
    references public.ai_conductor_interventions (id) on delete set null,
  add constraint ai_conductor_incidents_invoice_id_fkey foreign key (invoice_id)
    references public.ai_conductor_invoices (id) on delete set null;

alter table public.ai_conductor_tasks
  add constraint ai_conductor_tasks_group_id_fkey foreign key (group_id)
    references public.ai_conductor_task_groups (id) on delete set null,
  add constraint ai_conductor_tasks_quotation_id_fkey foreign key (quotation_id)
    references public.ai_conductor_quotations (id) on delete set null;

alter table public.ai_conductor_invoices
  add constraint ai_conductor_invoices_incident_id_fkey foreign key (incident_id)
    references public.ai_conductor_incidents (id) on delete set null,
  add constraint ai_conductor_invoices_quotation_id_fkey foreign key (quotation_id)
    references public.ai_conductor_quotations (id) on delete set null;

alter table public.ai_conductor_notifications
  add constraint ai_conductor_notifications_incident_id_fkey foreign key (incident_id)
    references public.ai_conductor_incidents (id) on delete set null,
  add constraint ai_conductor_notifications_task_id_fkey foreign key (task_id)
    references public.ai_conductor_tasks (id) on delete set null,
  add constraint ai_conductor_notifications_quotation_id_fkey foreign key (quotation_id)
    references public.ai_conductor_quotations (id) on delete set null,
  add constraint ai_conductor_notifications_invoice_id_fkey foreign key (invoice_id)
    references public.ai_conductor_invoices (id) on delete set null;

-- ---------- indexes (foreign keys, list views, "my work" lookups) ----------

create index if not exists idx_ai_conductor_buildings_manager on public.ai_conductor_buildings (manager_id);
create index if not exists idx_ai_conductor_units_building on public.ai_conductor_units (building_id);
create index if not exists idx_ai_conductor_units_client on public.ai_conductor_units (client_id);

create index if not exists idx_ai_conductor_incidents_manager on public.ai_conductor_incidents (manager_id);
create index if not exists idx_ai_conductor_incidents_building on public.ai_conductor_incidents (building_id);
create index if not exists idx_ai_conductor_incidents_unit on public.ai_conductor_incidents (unit_id);
create index if not exists idx_ai_conductor_incidents_created on public.ai_conductor_incidents (created_at desc);
create index if not exists idx_ai_conductor_incidents_techs on public.ai_conductor_incidents using gin (hired_tech_ids);

create index if not exists idx_ai_conductor_tasks_incident on public.ai_conductor_tasks (incident_id);
create index if not exists idx_ai_conductor_tasks_group on public.ai_conductor_tasks (group_id);
create index if not exists idx_ai_conductor_tasks_quotation on public.ai_conductor_tasks (quotation_id);
create index if not exists idx_ai_conductor_tasks_techs on public.ai_conductor_tasks using gin (hired_tech_ids);

create index if not exists idx_ai_conductor_task_groups_incident on public.ai_conductor_task_groups (incident_id);
create index if not exists idx_ai_conductor_task_groups_task on public.ai_conductor_task_groups (task_id);
create index if not exists idx_ai_conductor_task_groups_members on public.ai_conductor_task_groups using gin (member_ids);

create index if not exists idx_ai_conductor_group_messages_group on public.ai_conductor_group_messages (group_id, created_at);
create index if not exists idx_ai_conductor_group_messages_from on public.ai_conductor_group_messages (from_id);
create index if not exists idx_ai_conductor_incident_messages_incident on public.ai_conductor_incident_messages (incident_id, created_at);
create index if not exists idx_ai_conductor_incident_messages_from on public.ai_conductor_incident_messages (from_id);

create index if not exists idx_ai_conductor_quotations_incident on public.ai_conductor_quotations (incident_id);
create index if not exists idx_ai_conductor_quotations_task on public.ai_conductor_quotations (task_id);
create index if not exists idx_ai_conductor_quotations_client on public.ai_conductor_quotations (client_id);
create index if not exists idx_ai_conductor_quotations_created_by on public.ai_conductor_quotations (created_by);

create index if not exists idx_ai_conductor_interventions_incident on public.ai_conductor_interventions (incident_id);
create index if not exists idx_ai_conductor_interventions_task on public.ai_conductor_interventions (task_id);
create index if not exists idx_ai_conductor_interventions_quotation on public.ai_conductor_interventions (quotation_id);
create index if not exists idx_ai_conductor_interventions_client on public.ai_conductor_interventions (client_id);
create index if not exists idx_ai_conductor_interventions_manager on public.ai_conductor_interventions (manager_id);
create index if not exists idx_ai_conductor_interventions_scheduled on public.ai_conductor_interventions (scheduled_at);
create index if not exists idx_ai_conductor_interventions_techs on public.ai_conductor_interventions using gin (tech_ids);

create index if not exists idx_ai_conductor_invoices_incident on public.ai_conductor_invoices (incident_id);
create index if not exists idx_ai_conductor_invoices_quotation on public.ai_conductor_invoices (quotation_id);
create index if not exists idx_ai_conductor_invoices_status_due on public.ai_conductor_invoices (status, due_at);

create index if not exists idx_ai_conductor_notifications_incident on public.ai_conductor_notifications (incident_id);
create index if not exists idx_ai_conductor_notifications_task on public.ai_conductor_notifications (task_id);
create index if not exists idx_ai_conductor_notifications_quotation on public.ai_conductor_notifications (quotation_id);
create index if not exists idx_ai_conductor_notifications_invoice on public.ai_conductor_notifications (invoice_id);
create index if not exists idx_ai_conductor_notifications_created on public.ai_conductor_notifications (user_id, created_at desc);

create index if not exists idx_ai_conductor_feedback_user on public.ai_conductor_feedback (user_id);
create index if not exists idx_ai_conductor_settings_updated_by on public.ai_conductor_settings (updated_by);
