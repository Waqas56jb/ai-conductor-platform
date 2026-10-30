-- A client only sees a contract once the office sent it: drafts stay internal.

drop policy contracts_select on public.ai_conductor_contracts;

create policy contracts_select on public.ai_conductor_contracts
  for select to authenticated
  using (
    (client_id = public.ai_conductor_profile_id() and status <> 'draft')
    or public.ai_conductor_role() in ('manager', 'director', 'admin', 'accountant')
  );
