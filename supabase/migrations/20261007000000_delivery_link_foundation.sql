-- 20261007000000_delivery_link_foundation.sql
--
-- Purely additive. NOT applied to production. Test on a Supabase branch first.
-- Extends the existing public.bookings / public.location_landmarks rather than
-- creating a parallel delivery_requests table: bookings stays the single source
-- of truth. Does not touch get_delivery_price, quoted_amount_kes or any status.
-- RLS enabled with no policies, matching 20260927120000: only service-role
-- Edge Functions read/write until a staff policy using is_staff() is added.

-- 1. Opaque delivery links (token is the only thing a customer ever sees).
create table if not exists public.delivery_links (
  token        text primary key check (token ~ '^[A-Za-z0-9]{8,12}$'),
  booking_id   uuid references public.bookings(id) on delete cascade,
  merchant_id  uuid references public.organizations(id),
  created_by   uuid,
  expires_at   timestamptz not null default now() + interval '7 days',
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists delivery_links_booking_idx on public.delivery_links (booking_id);
create index if not exists delivery_links_merchant_idx on public.delivery_links (merchant_id);

-- 2. Location confidence + provenance on bookings (nullable, never blocking).
alter table public.bookings
  add column if not exists source text,                 -- link|lucy|ops|merchant|whatsapp
  add column if not exists contact_phone text,          -- canonical 2547XXXXXXXX
  add column if not exists dropoff_confidence int check (dropoff_confidence between 0 and 100),
  add column if not exists dropoff_method text,         -- gps|pin|address|landmark|call
  add column if not exists dropoff_accuracy_m numeric,
  add column if not exists dropoff_note text,           -- gate/floor/landmark directions
  add column if not exists delivered_lat double precision,
  add column if not exists delivered_lng double precision,
  add column if not exists found_first_try boolean,
  add column if not exists est_cost_kes int,            -- actual costs live in public.delivery_costs
  add column if not exists route_km numeric check (route_km >= 0),       -- routed distance used for the quote
  add column if not exists route_minutes int check (route_minutes >= 0),
  add column if not exists off_road_m int check (off_road_m >= 0);       -- pin distance from nearest mapped road; large = human quote

-- 3. Landmark learning on the existing gazetteer.
alter table public.location_landmarks
  add column if not exists kind text,
  add column if not exists successes int not null default 0,
  add column if not exists failures  int not null default 0,
  add column if not exists directions text;

-- 4. Append-only audit trail.
create table if not exists public.delivery_events (
  id          bigserial primary key,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status   text,
  actor_type  text not null,       -- system|customer|staff|rider|provider
  actor_id    text,
  meta        jsonb not null default '{}',
  at          timestamptz not null default now()
);
create index if not exists delivery_events_booking_idx on public.delivery_events (booking_id, at);

create or replace function public.delivery_events_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'delivery_events is append-only';
end $$;

drop trigger if exists delivery_events_no_change on public.delivery_events;
create trigger delivery_events_no_change
  before update or delete on public.delivery_events
  for each row execute function public.delivery_events_immutable();

alter table public.delivery_links  enable row level security;
alter table public.delivery_events enable row level security;