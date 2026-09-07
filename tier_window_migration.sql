-- =============================================================================
-- Tier model: lifetime spend -> rolling 365-day window
-- =============================================================================
-- TEMPLATE — same caveat as the other two files. Before running, pull the
-- real trigger/function that currently sets tier:
--     select pg_get_functiondef('public.calculate_tier'::regprocedure);
-- (name is a guess based on the comment left in rewards-staff-cloud.js's
-- header — confirm the actual function/trigger name in your schema, it
-- may be named differently or implemented as a generated column instead
-- of a trigger.)
--
-- What this does, conceptually:
--   1. Adds a tier_window_spend column to members — spend in the last
--      365 days only, kept up to date automatically.
--   2. Recomputes it whenever a transaction is inserted (a booking, a
--      refund, a staff adjustment).
--   3. ALSO needs a periodic recompute for members who simply go quiet —
--      their window_spend should drop even with no new transaction, as
--      old transactions fall outside the 365-day window over time. A
--      trigger alone won't catch that; see Part 3 for a scheduled job.
--   4. Points at the SAME column from tier calculation, wherever that
--      currently reads lifetime_spend.
-- =============================================================================


-- =============================================================================
-- PART 1 — Column + recompute function
-- =============================================================================

alter table public.members add column if not exists tier_window_spend numeric not null default 0;

create or replace function public.recompute_tier_window_spend(p_member_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    case
      when type = 'sale' then amount
      when type = 'refund' then -amount
      when type = 'adjustment' then coalesce(spend_delta, 0) -- adjust column name to match your transactions table
      else 0
    end
  ), 0)
  from public.transactions -- adjust table name if different
  where member_id = p_member_id
    and date >= (now() - interval '365 days'); -- adjust column name if different
$$;


-- =============================================================================
-- PART 2 — Keep it current whenever a transaction is written
-- =============================================================================

create or replace function public.on_transaction_update_tier_window()
returns trigger
language plpgsql
as $$
begin
  update public.members
  set tier_window_spend = public.recompute_tier_window_spend(new.member_id),
      -- REPLACE with however your existing calculate_tier logic assigns the
      -- tier enum from a spend number — this is the one line that actually
      -- switches tier qualification from lifetime to rolling-window.
      tier = (
        select t.name from (values
          ('vip', 75000), ('platinum', 35000), ('gold', 15000), ('silver', 5000), ('bronze', 0)
        ) as t(name, min_spend)
        where public.recompute_tier_window_spend(new.member_id) >= t.min_spend
        order by t.min_spend desc
        limit 1
      )::public.member_tier -- adjust enum cast if your tier column type differs
  where id = new.member_id;
  return new;
end;
$$;

drop trigger if exists trg_transaction_tier_window on public.transactions;
create trigger trg_transaction_tier_window
  after insert or update on public.transactions
  for each row execute function public.on_transaction_update_tier_window();


-- =============================================================================
-- PART 3 — Catch members who go quiet (no new transaction, but old ones
-- aging out of the 365-day window). A trigger only fires on write, so this
-- needs a scheduled job — Supabase supports pg_cron for this.
-- =============================================================================

-- One-time backfill for everyone right now:
update public.members
set tier_window_spend = public.recompute_tier_window_spend(id);

-- Then schedule a nightly recompute (requires the pg_cron extension —
-- enable it under Database > Extensions in the Supabase dashboard first):
--
-- select cron.schedule(
--   'recompute-tier-windows-nightly',
--   '0 2 * * *', -- 2am daily
--   $$
--     update public.members
--     set tier_window_spend = public.recompute_tier_window_spend(id),
--         tier = ( ... same tier-from-spend logic as Part 2 ... )
--     where tier_window_spend != public.recompute_tier_window_spend(id);
--   $$
-- );
--
-- Fill in the same tier-assignment logic from Part 2 in the commented
-- block above before scheduling it.


-- =============================================================================
-- PART 4 — Make the RPCs actually return the new column
-- =============================================================================
-- lookup_member(), staff_search_members(), and staff_dashboard_stats()
-- all need to include tier_window_spend in whatever JSON/row they
-- currently build for a member — otherwise rewards-cloud.js's fallback to
-- lifetimeSpend (see the comment in tierProgress()) will keep firing
-- forever, silently undoing everything above from the client's point of
-- view. Find each function with pg_get_functiondef() and add
-- tier_window_spend alongside wherever lifetime_spend is already selected.
