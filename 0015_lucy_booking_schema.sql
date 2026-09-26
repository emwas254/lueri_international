-- 0015_lucy_booking_schema.sql
-- Adds the schema needed for Lucy to take bookings by landmark name,
-- resolve them via a cached gazetteer + LocationIQ fallback, and
-- auto-price the fixed-rate service categories while routing
-- variable/negotiated jobs to a human quote.
--
-- Review before applying to production. This is a NEW, additive
-- migration — it does not touch the existing bookings/profiles/
-- customer_profiles tables from the Phase 1 migration, deliberately,
-- so we're not guessing at those tables' real column names again.
-- Reconciling lucy_bookings with the main bookings table (if that's
-- wanted) should be a separate, explicit follow-up once this is
-- live and verified.

-- ============================================================
-- 1. known_locations — the growing Nairobi landmark gazetteer
-- ============================================================
create table if not exists known_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',   -- lowercased variants: "ajib", "ajib house", "ajib bldg"
  lat double precision not null,
  lng double precision not null,
  verified boolean not null default false, -- true once a human has eyeballed the pin placement
  source text not null default 'locationiq', -- 'manual' | 'locationiq'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_known_locations_aliases
  on known_locations using gin (aliases);

comment on table known_locations is
  'Cached landmark -> coordinate resolutions. Checked before every LocationIQ API call to keep usage inside the free tier and to accumulate a proprietary gazetteer of Nairobi buildings customers actually reference.';

-- ============================================================
-- 2. pricing_rules — config, not code, so prices can change
--    without touching the Edge Function
-- ============================================================
do $$ begin
  create type service_type as enum (
    'cbd_hop',
    'document',
    'fabric_errand',
    'bulky_luggage',
    'bulk_purchase',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_type service_type not null unique,
  base_price_kes numeric(10,2) not null,
  price_per_km_kes numeric(10,2),          -- null = flat price, distance ignored for pricing
  requires_manual_quote boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

insert into pricing_rules (service_type, base_price_kes, price_per_km_kes, requires_manual_quote, notes)
values
  ('cbd_hop',       100, null, false, 'Flat CBD-to-CBD hop, e.g. moving a cable'),
  ('document',      200, null, false, 'Cheques and documents'),
  ('fabric_errand', 400, null, false, 'Eastleigh fabric check-and-confirm errand'),
  ('bulky_luggage', 300, null, false, 'Includes ~100 KES trolley hire cost, ~200 net'),
  ('bulk_purchase',   0, null, true,  'e.g. 15kg rice run — priced manually per job, Lucy escalates to staff'),
  ('other',           0, null, true,  'Anything Lucy cannot categorize — always escalate, never guess a price')
on conflict (service_type) do nothing;

comment on table pricing_rules is
  'Single source of truth for Lucy''s auto-quoted prices. Edit prices here, not in code. requires_manual_quote=true means Lucy must NOT generate a number — it creates the booking as awaiting_quote and notifies staff instead.';

-- ============================================================
-- 3. lucy_bookings — what Lucy actually creates
-- ============================================================
create table if not exists lucy_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text not null,
  service_type service_type not null,

  pickup_location_id uuid references known_locations(id),
  pickup_raw_text text not null,
  dropoff_location_id uuid references known_locations(id),
  dropoff_raw_text text not null,

  -- Captured on every booking, even flat-rate ones, so there is a
  -- real distance dataset ready whenever the margin/unit-economics
  -- work happens — no need to backfill later.
  distance_km numeric(6,2),
  duration_min numeric(6,1),

  quoted_price_kes numeric(10,2),          -- null when requires_manual_quote
  status text not null default 'pending_confirmation',
    -- pending_confirmation | awaiting_quote | confirmed | cancelled

  staff_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_lucy_bookings_status on lucy_bookings (status);

comment on table lucy_bookings is
  'Bookings created through the Lucy chatbot flow. status=awaiting_quote means Lucy deliberately did NOT price the job — a human must.';

-- ============================================================
-- 4. Lock these down by default — service_role (used by the
--    Edge Function) bypasses RLS automatically; anon/authenticated
--    get nothing until an explicit policy is added.
-- ============================================================
alter table known_locations enable row level security;
alter table pricing_rules  enable row level security;
alter table lucy_bookings  enable row level security;

-- NOTE: staff read-access policies (so rewards-staff.html or a future
-- console can list lucy_bookings) are intentionally NOT included here.
-- Add them once we confirm the exact is_staff()/role pattern already
-- in use elsewhere in this project, rather than guessing a second
-- version of it.
