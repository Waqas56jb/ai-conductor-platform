-- Clients are external customers: they must not see each other.
-- Before: every member of a company could read every profile of that company,
-- so a client could list the other clients' names, emails and phones.
-- After:
--   - staff profiles (non-client) stay visible to the whole company;
--   - a client profile is visible to the client, to staff, and to technicians
--     assigned to one of that client's incidents.

drop policy users_select on public.ai_conductor_users;

create policy users_select on public.ai_conductor_users
  for select to authenticated
  using (
    role <> 'client'
    or id = public.ai_conductor_profile_id()
    or public.ai_conductor_is_staff()
    or exists (
      select 1 from public.ai_conductor_incidents i
      where i.client_id = ai_conductor_users.id
        and public.ai_conductor_profile_id() = any (i.hired_tech_ids)
    )
  );
