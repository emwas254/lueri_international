-- 20261009000000_pricing_and_quotes.sql
-- Purely additive. Editable pricing settings + a quote history table.
-- RLS on, no policies: only service-role Edge Functions read/write (matches 20261007000000).
-- Does NOT touch bookings.quoted_amount_kes, so the existing payment flow is unaffected.

create table if not exists public.pricing_settings (
  id          int primary key default 1 check (id = 1),     -- single row
  config      jsonb not null default '{}',                  -- overrides merged over code defaults (see _shared/quote.ts)
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
insert into public.pricing_settings (id, config) values (1, '{}') on conflict (id) do nothing;

create table if not exists public.delivery_quotes (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  mode            text not null check (mode in ('transit','motorbike')),
  price_kes       int  not null check (price_kes >= 0),
  est_cost_kes    int,
  margin_pct      numeric,
  distance_km     numeric,
  distance_source text,                                     -- routing|straight_line
  eta_minutes     int,
  rush            boolean not null default false,
  breakdown       jsonb not null default '{}',              -- internal only, never sent to customers
  valid_until     timestamptz not null,
  created_at      timestamptz not null default now()
);
create index if not exists delivery_quotes_booking_idx on public.delivery_quotes (booking_id, created_at desc);

alter table public.pricing_settings enable row level security;
alter table public.delivery_quotes  enable row level security;
