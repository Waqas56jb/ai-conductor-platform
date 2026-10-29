-- Block Supabase REST/GraphQL access to every ai_conductor_* table.
--
-- Before this, `anon` and `authenticated` held every privilege (including
-- SELECT on ai_conductor_users.password_hash, DELETE and TRUNCATE) with RLS off,
-- so anyone holding the public publishable key could read or wipe the data.
--
-- RLS alone does not stop TRUNCATE, so grants are revoked as well. Server-side
-- connections (postgres, service_role) are unaffected. Client-facing access will
-- be added later through explicit RLS policies and grants.
--
-- The migration runner re-applies this same lockdown after every run, so new
-- ai_conductor_* tables are covered automatically.

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'ai\_conductor\_%'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('revoke all on table public.%I from anon, authenticated', t.relname);
  end loop;
end
$$;
