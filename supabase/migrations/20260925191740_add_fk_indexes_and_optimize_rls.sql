-- Production hardening applied to Supabase project 2026-09-25.
-- Adds covering indexes for all currently unindexed foreign keys and
-- wraps auth.uid() in SELECT inside RLS policies to avoid per-row re-evaluation.

create index if not exists bookings_business_plan_code_idx on public.bookings (business_plan_code);
create index if not exists customer_profiles_member_id_idx on public.customer_profiles (member_id);
create index if not exists delivery_costs_recorded_by_idx on public.delivery_costs (recorded_by);
create index if not exists members_effective_tier_idx on public.members (effective_tier);
create index if not exists members_purchased_tier_idx on public.members (purchased_tier);
create index if not exists memberships_member_id_idx on public.memberships (member_id);
create index if not exists memberships_payment_id_idx on public.memberships (payment_id);
create index if not exists memberships_plan_code_idx on public.memberships (plan_code);
create index if not exists organization_memberships_organization_id_idx on public.organization_memberships (organization_id);
create index if not exists organization_memberships_payment_id_idx on public.organization_memberships (payment_id);
create index if not exists organization_memberships_plan_code_idx on public.organization_memberships (plan_code);
create index if not exists organizations_plan_code_idx on public.organizations (plan_code);
create index if not exists payments_membership_id_idx on public.payments (membership_id);
create index if not exists payments_organization_id_idx on public.payments (organization_id);
create index if not exists payments_verified_by_idx on public.payments (verified_by);
create index if not exists rewards_transactions_payment_id_idx on public.rewards_transactions (payment_id);
create index if not exists rewards_transactions_staff_id_idx on public.rewards_transactions (staff_id);

do $$
declare r record; u text; c text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public'
      and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
  loop
    u := r.qual;
    c := r.with_check;
    if u is not null then u := replace(u, 'auth.uid()', '(select auth.uid())'); end if;
    if c is not null then c := replace(c, 'auth.uid()', '(select auth.uid())'); end if;
    execute format('alter policy %I on %I.%I %s %s',
      r.policyname, r.schemaname, r.tablename,
      case when u is not null then 'using (' || u || ')' else '' end,
      case when c is not null then 'with check (' || c || ')' else '' end);
  end loop;
end $$;