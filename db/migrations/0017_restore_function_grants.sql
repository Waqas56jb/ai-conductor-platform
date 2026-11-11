-- The RLS helper functions lost their EXECUTE grant to `authenticated` outside
-- this runner (the Supabase project is shared), so every policy calling them
-- failed with "permission denied for function ai_conductor_profile_id" and no
-- signed-in user could reach their profile. Restores the grants of 0004/0006
-- exactly: signed-in users only, never anon. ai_conductor_next_number stays
-- service-role only.

do $$
declare
  f text;
begin
  foreach f in array array[
    'ai_conductor_profile_id',
    'ai_conductor_company_id',
    'ai_conductor_role',
    'ai_conductor_is_office',
    'ai_conductor_is_staff'
  ] loop
    execute format('revoke all on function public.%I() from public, anon', f);
    execute format('grant execute on function public.%I() to authenticated', f);
  end loop;
end
$$;

revoke all on function public.ai_conductor_can_see_incident(text) from public, anon;
grant execute on function public.ai_conductor_can_see_incident(text) to authenticated;
