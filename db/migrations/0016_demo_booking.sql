-- Free demo booking from the marketing site, and first-party conversion events.
--
-- Platform tables, not company data: no company_id, no policy. The runner
-- enables RLS and closes them to anon / authenticated; only the server (service
-- role) reads and writes them, after its own checks.

create table public.ai_conductor_demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 40),
  company text check (char_length(company) <= 160),
  sector text check (char_length(sector) <= 80),
  message text check (char_length(message) <= 2000),
  -- Start of the 30-minute video call (Europe/Paris office hours).
  slot_start timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'cancelled')),
  -- Secret of the team's "confirm / cancel" link.
  token text not null unique,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  -- Where the visitor came from (utm_* or ?src=qr), never who they are.
  source text check (char_length(source) <= 60),
  medium text check (char_length(medium) <= 60),
  campaign text check (char_length(campaign) <= 80),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

-- One demo per slot: a second booking of a live slot fails, even under a race.
create unique index ai_conductor_demo_requests_slot
  on public.ai_conductor_demo_requests (slot_start)
  where status <> 'cancelled';
create index ai_conductor_demo_requests_created
  on public.ai_conductor_demo_requests (created_at desc);
create index ai_conductor_demo_requests_email
  on public.ai_conductor_demo_requests (lower(email), created_at desc);

-- Anonymous funnel counters: no cookie, no IP, no user agent, no identifier.
create table public.ai_conductor_site_events (
  id bigint generated always as identity primary key,
  name text not null
    check (name in ('page_view', 'demo_click', 'video_play', 'demo_submit', 'demo_confirmed')),
  page text check (char_length(page) <= 120),
  placement text check (char_length(placement) <= 40),
  source text check (char_length(source) <= 60),
  medium text check (char_length(medium) <= 60),
  campaign text check (char_length(campaign) <= 80),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index ai_conductor_site_events_created
  on public.ai_conductor_site_events (created_at desc, name);

revoke all on public.ai_conductor_demo_requests from authenticated, anon;
revoke all on public.ai_conductor_site_events from authenticated, anon;
