-- New tables inherit Supabase's default privileges (ALL to authenticated).
-- 0004 added grants on ai_conductor_companies without first removing those
-- defaults, leaving INSERT, DELETE and all-column UPDATE in place. Reset to
-- exactly what the policies intend.

revoke all on public.ai_conductor_companies from authenticated;
grant select on public.ai_conductor_companies to authenticated;
grant update (name, legal_form, siret, vat_number, address, postal_code, city, country, phone, email)
  on public.ai_conductor_companies to authenticated;
