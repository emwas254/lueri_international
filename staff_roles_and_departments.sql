-- =============================================================================
-- Staff roles & departments — bootstrap + ongoing admin control
-- =============================================================================
-- TEMPLATE — same caveat as the last SQL file: I have not seen your real
-- schema. If `staff_profiles` (or an equivalent) already exists from the
-- staff_add_transaction authorization check, adapt this to match it
-- instead of creating a duplicate table. Run:
--     select pg_get_functiondef('public.staff_add_transaction'::regprocedure);
-- and look at what table/columns it already checks — reuse that table.
-- =============================================================================


-- =============================================================================
-- PART 1 — Table (skip if an equivalent already exists — adapt column
-- names to match instead)
-- =============================================================================

create type public.staff_department as enum ('admin', 'finance', 'sales', 'support', 'info');

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  department public.staff_department not null default 'support',
  active boolean not null default false, -- false = pending, exactly like today
  registered_by uuid references auth.users(id), -- which admin approved/created this account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every staff signup should land a row here automatically. If a trigger
-- like this doesn't already exist on auth.users, add one:
create or replace function public.handle_new_staff_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_profiles (user_id, full_name, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute function public.handle_new_staff_signup();


-- =============================================================================
-- PART 2 — Bootstrap: run this ONCE, manually, after you sign up through
-- rewards-staff.html. Replace the email with your own.
-- =============================================================================

update public.staff_profiles
set department = 'admin', active = true, registered_by = user_id -- self-approved, the one and only time this is allowed
where user_id = (select id from auth.users where email = 'your-email@example.com');


-- =============================================================================
-- PART 3 — Ongoing: admin-only RPC to approve a pending staff account and
-- assign their department. This is what a future "Approve staff" panel in
-- the console would call — for now, you can call it directly via the
-- Supabase SQL editor or a simple authenticated fetch.
-- =============================================================================

create or replace function public.admin_set_staff_role(
  p_user_id uuid,
  p_department public.staff_department,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid() and active = true and department = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  update public.staff_profiles
  set department = p_department, active = p_active, registered_by = auth.uid(), updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.admin_set_staff_role(uuid, public.staff_department, boolean) from public, anon;
grant execute on function public.admin_set_staff_role(uuid, public.staff_department, boolean) to authenticated;


-- =============================================================================
-- PART 4 — "Which person keyed in what, at what time" — the audit trail you
-- asked about. Two separate things live here, don't conflate them:
--   a) WHO did WHAT to business data (a member registration, a transaction)
--      — already covered by staff_add_transaction's existing behaviour and
--      by staff_register_member from the last file (once you finish
--      adapting it). Both should already be recording auth.uid() against
--      the row they create.
--   b) WHO logged IN, WHEN — this is a separate login audit, not covered by
--      anything above. Supabase Auth keeps its own internal audit log
--      (auth.audit_log_entries) but it's not something you query casually
--      from the client. If you want a staff-facing "who logged in when"
--      view, the simplest approach is logging it yourself on successful
--      login, from rewards-staff-cloud.js's staffLogIn(), into a small
--      table:

create table if not exists public.staff_login_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  logged_in_at timestamptz not null default now()
);

-- Then staff_add_transaction / staff_register_member / staff_search_members
-- already give you the "who did what" half for free via their own
-- p_member_id / auth.uid() usage — a full activity feed is just a UNION of
-- staff_login_log with whatever tables already carry a registered_by /
-- created_by column. Worth building once you have more than a couple of
-- staff, not urgent with a team of four.
