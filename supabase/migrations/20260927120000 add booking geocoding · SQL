-- 20260927120000_add_booking_geocoding.sql
--
-- Purely additive. Does not alter get_delivery_price, quoted_amount_kes,
-- or any existing bookings column. Adds:
--   1. public.location_landmarks — a cached landmark -> coordinate gazetteer
--      (checked before every LocationIQ call, so repeat landmarks like
--      "Ajib House" cost nothing after the first resolution).
--   2. Nullable coordinate + landmark-reference columns on public.bookings,
--      populated by delivery-payment-initiate on a best-effort basis.
--      Never required, never blocking, never used by get_delivery_price.

create table if not exists public.location_landmarks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',   -- lowercased variants: "ajib", "ajib house", "ajib bldg"
  lat double precision not null,
  lng double precision not null,
  verified boolean not null default false, -- true once a human has confirmed the pin placement
  source text not null default 'locationiq', -- 'manual' | 'locationiq'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists location_landmarks_aliases_idx
  on public.location_landmarks using gin (aliases);

comment on table public.location_landmarks is
  'Cached Nairobi landmark -> coordinate resolutions used for booking confirmation maps. Independent of get_delivery_price, which prices by pickup/dropoff text.';

alter table public.bookings
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists pickup_landmark_id uuid references public.location_landmarks(id),
  add column if not exists dropoff_lat double precision,
  add column if not exists dropoff_lng double precision,
  add column if not exists dropoff_landmark_id uuid references public.location_landmarks(id);

create index if not exists bookings_pickup_landmark_id_idx on public.bookings (pickup_landmark_id);
create index if not exists bookings_dropoff_landmark_id_idx on public.bookings (dropoff_landmark_id);

comment on column public.bookings.pickup_lat is 'Best-effort geocoded pickup coordinate, for confirmation-map display only. Never used to compute quoted_amount_kes.';
comment on column public.bookings.dropoff_lat is 'Best-effort geocoded dropoff coordinate, for confirmation-map display only. Never used to compute quoted_amount_kes.';

alter table public.location_landmarks enable row level security;
-- No policies added: service-role (used by delivery-payment-initiate) bypasses
-- RLS automatically. anon/authenticated get nothing until a policy is added —
-- add a staff-read policy later once the project's is_staff()/role pattern is
-- confirmed, rather than guessing a second version of it here.
