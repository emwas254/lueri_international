-- =============================================================================
-- Lueri Rewards / Corporate — phone-format backfill + staff audit trail
-- =============================================================================
-- READ THIS BEFORE RUNNING ANYTHING:
--
-- 1. This is a TEMPLATE, not a drop-in script. I have not seen the live
--    source of register_member() or staff_add_transaction(), only the
--    client-side calls to them and the column names confirmed in earlier
--    audits (members: full_name, member_no (bigint), tier (enum
--    member_tier); organizations: contact_phone, contact_email,
--    physical_address, contact_person_name, contact_person_role,
--    expected_volume, kra_pin, deleted_at). Before running Part 2, pull
--    the real function body with:
--        select pg_get_functiondef('public.register_member'::regprocedure);
--        select pg_get_functiondef('public.staff_add_transaction'::regprocedure);
--    and adapt staff_register_member below to match its actual insert
--    logic, validation, and return shape exactly.
--
-- 2. TAKE A BACKUP before running Part 1 (the phone backfill). It rewrites
--    existing data. Run the SELECT preview queries first and eyeball the
--    output before running any UPDATE.
--
-- 3. Deploy order matters:
--      a. Take a backup.
--      b. Run the SELECT previews below. Confirm counts look sane.
--      c. Run Part 1 (phone backfill) inside a transaction.
--      d. Deploy the updated rewards-cloud.js / rewards-staff-cloud.js /
--         corporate-signup.js (already canonical-format) at the same time
--         or immediately after — not before, or new writes will use the
--         new format while old rows still use the old one.
--      e. Run Part 2 (staff_register_member) once its body has been
--         corrected against the real register_member() definition.
--      f. Deploy the updated rewards-staff-cloud.js (already calls
--         staff_register_member) at the same time as step (e).
-- =============================================================================


-- =============================================================================
-- PART 1 — Phone number backfill to canonical 254XXXXXXXXX (no plus, no
-- leading zero)
-- =============================================================================

-- --- Preview: how many rows would change, and what would they become? ---
-- Run these SELECTs first. Do not run the UPDATEs until the output looks
-- right for your actual data.

select
  phone as current_phone,
  case
    when phone ~ '^0[71][0-9]{8}$' then '254' || substring(phone from 2)
    when phone ~ '^\+254[71][0-9]{8}$' then substring(phone from 2)
    when phone ~ '^254[71][0-9]{8}$' then phone -- already canonical
    else null -- doesn't match any known shape — inspect manually, don't guess
  end as new_phone,
  count(*)
from public.members
group by 1, 2
order by count(*) desc;

select
  contact_phone as current_phone,
  case
    when contact_phone ~ '^0[71][0-9]{8}$' then '254' || substring(contact_phone from 2)
    when contact_phone ~ '^\+254[71][0-9]{8}$' then substring(contact_phone from 2)
    when contact_phone ~ '^254[71][0-9]{8}$' then contact_phone
    else null
  end as new_phone,
  count(*)
from public.organizations
group by 1, 2
order by count(*) desc;

-- If either preview shows a meaningful number of NULL new_phone rows,
-- STOP and inspect those specific rows manually before proceeding —
-- they're phone values that don't match the expected 0/+254/254 shapes
-- at all (typos, landlines, blanks) and need a human decision, not a
-- regex guess.

-- --- Actual backfill — run inside a transaction, review row counts,
-- then COMMIT. Rolls back cleanly if anything looks wrong. ---

begin;

update public.members
set phone = '254' || substring(phone from 2)
where phone ~ '^0[71][0-9]{8}$';

update public.members
set phone = substring(phone from 2)
where phone ~ '^\+254[71][0-9]{8}$';

update public.organizations
set contact_phone = '254' || substring(contact_phone from 2)
where contact_phone ~ '^0[71][0-9]{8}$';

update public.organizations
set contact_phone = substring(contact_phone from 2)
where contact_phone ~ '^\+254[71][0-9]{8}$';

-- Sanity check: every phone in both tables should now match the
-- canonical shape (or be NULL, or be one of the pre-existing unmatched
-- values you already reviewed above).
select 'members' as tbl, count(*) as non_canonical
from public.members
where phone is not null and phone !~ '^254[71][0-9]{8}$'
union all
select 'organizations', count(*)
from public.organizations
where contact_phone is not null and contact_phone !~ '^254[71][0-9]{8}$';

-- If both counts above are 0 (or match rows you already decided to leave
-- alone), commit. Otherwise, rollback and investigate.
-- commit;
-- rollback;


-- =============================================================================
-- PART 2 — staff_register_member: authenticated version of register_member,
-- so registrations made from the staff console carry an audit trail of
-- which staff account performed them.
-- =============================================================================
-- TEMPLATE ONLY. Replace the body of the insert/validation section with
-- whatever register_member() actually does (KRA-PIN-style duplicate
-- checks, column defaults, tier initialization, etc.) — this only adds
-- the authorization + audit-trail wrapper around it.
--
-- Assumes a staff/profile table tracks approval status and exposes
-- something equivalent to `role = 'pending'/'staff'/'admin'` and
-- `active = true/false`, matching the pattern staff_add_transaction()
-- already uses (confirm the real column/table name before running).

create or replace function public.staff_register_member(
  p_name text,
  p_phone text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authorized boolean;
  v_member jsonb;
begin
  -- Mirror whatever authorization check staff_add_transaction() already
  -- uses. Placeholder shown assumes a `staff_profiles` table with
  -- `user_id`, `role`, `active` columns — adjust to match reality.
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid()
      and active = true
      and role in ('staff', 'admin')
  ) into v_is_authorized;

  if not v_is_authorized then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  if p_phone !~ '^254[71][0-9]{8}$' then
    return jsonb_build_object('success', false, 'error', 'invalid_phone');
  end if;

  -- REPLACE EVERYTHING BELOW THIS LINE with the actual insert/validation
  -- logic from register_member() — duplicate-phone check, member_no
  -- sequence, default tier, etc. This placeholder is illustrative only.
  insert into public.members (full_name, phone, email, registered_by)
  values (p_name, p_phone, p_email, auth.uid())
  returning jsonb_build_object(
    'id', id,
    'name', full_name,
    'phone', phone,
    'email', email,
    'memberNumber', member_no,
    'tier', tier,
    'points', 0,
    'lifetimeSpend', 0
  ) into v_member;

  return jsonb_build_object('success', true, 'member', v_member);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'A member with this phone number already exists.');
end;
$$;

-- NOTE: this assumes a `registered_by` column exists on `members`. If it
-- doesn't yet, add it first:
--   alter table public.members add column if not exists registered_by uuid references auth.users(id);
-- and confirm RLS on `members` doesn't block this SECURITY DEFINER
-- function from writing it (SECURITY DEFINER bypasses RLS for the
-- function's own operations, but double-check against your existing
-- policies before relying on that).

-- Restrict execution to authenticated staff only (anon should never be
-- able to call this — that's the whole point of moving off the public
-- register_member for this console):
revoke execute on function public.staff_register_member(text, text, text) from public, anon;
grant execute on function public.staff_register_member(text, text, text) to authenticated;
