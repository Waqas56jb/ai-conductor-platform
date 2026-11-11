-- Same incident as 0017, on tables: every privilege of `authenticated` on the
-- public schema was revoked outside this runner (the Supabase project is
-- shared). RLS policies were intact but unreachable, so signed-in users could
-- read nothing. Re-issues exactly the grants of 0004–0015; nothing more.

-- 0004 / 0005: companies, users (never password_hash), settings, notifications.
grant select on public.ai_conductor_companies to authenticated;
grant update (name, legal_form, siret, vat_number, address, postal_code, city, country, phone, email)
  on public.ai_conductor_companies to authenticated;

grant select (
  id, email, role, display_name, phone, photo_url, locale, active, company_id,
  auth_user_id, last_login_at, created_at, updated_at
) on public.ai_conductor_users to authenticated;
grant update (display_name, phone, photo_url, locale) on public.ai_conductor_users to authenticated;

grant select on public.ai_conductor_settings to authenticated;
grant update (approval_threshold_eur, reminder_day1, reminder_day2, ai_pricing_note)
  on public.ai_conductor_settings to authenticated;

grant select on public.ai_conductor_notifications to authenticated;
grant update (read) on public.ai_conductor_notifications to authenticated;

-- 0006, 0009, 0010, 0011, 0012, 0013, 0015: read-only through RLS.
do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_conductor_incidents', 'ai_conductor_quotations', 'ai_conductor_interventions',
    'ai_conductor_invoices', 'ai_conductor_incident_messages', 'ai_conductor_task_groups',
    'ai_conductor_group_messages', 'ai_conductor_technicians', 'ai_conductor_clients',
    'ai_conductor_feedback',
    'ai_conductor_assistant_profiles', 'ai_conductor_ai_conversations',
    'ai_conductor_ai_messages', 'ai_conductor_ai_actions',
    'ai_conductor_assistant_memories', 'ai_conductor_company_themes',
    'ai_conductor_signature_requests',
    'ai_conductor_priority_rules', 'ai_conductor_reminders', 'ai_conductor_push_subscriptions',
    'ai_conductor_contracts', 'ai_conductor_team_tasks', 'ai_conductor_meetings',
    'ai_conductor_payments', 'ai_conductor_service_orders', 'ai_conductor_approval_steps'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
