create table if not exists public.career_roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,
  location text not null default 'Nairobi, Kenya',
  employment_type text not null,
  summary text not null,
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  salary_range text,
  application_deadline date,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_roles_public_idx
  on public.career_roles (status, sort_order, application_deadline);

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.career_roles(id) on delete restrict,
  full_name text not null,
  email text not null,
  phone text not null,
  location text,
  summary text not null,
  cv_url text,
  linkedin_url text,
  availability text,
  expected_salary text,
  source text not null default 'website',
  status text not null default 'new'
    check (status in ('new','reviewing','shortlisted','interview','rejected','hired','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_applications_role_idx
  on public.career_applications (role_id, created_at desc);

create index if not exists career_applications_status_idx
  on public.career_applications (status, created_at desc);

create index if not exists career_applications_email_idx
  on public.career_applications (lower(email), created_at desc);

alter table public.career_roles enable row level security;
alter table public.career_applications enable row level security;

drop policy if exists "public can view open career roles" on public.career_roles;
create policy "public can view open career roles"
on public.career_roles
for select
to anon, authenticated
using (
  status = 'open'
  and (application_deadline is null or application_deadline >= current_date)
);

revoke all on public.career_roles from anon, authenticated;
grant select on public.career_roles to anon, authenticated;
revoke all on public.career_applications from anon, authenticated;

create or replace function public.submit_career_application(
  p_role_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_location text default null,
  p_summary text default '',
  p_cv_url text default null,
  p_linkedin_url text default null,
  p_availability text default null,
  p_expected_salary text default null,
  p_source text default 'website'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.career_roles%rowtype;
  v_application_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_summary text := trim(coalesce(p_summary, ''));
  v_cv text := nullif(trim(coalesce(p_cv_url, '')), '');
  v_linkedin text := nullif(trim(coalesce(p_linkedin_url, '')), '');
  v_recent integer;
begin
  select * into v_role
  from public.career_roles
  where id = p_role_id
    and status = 'open'
    and (application_deadline is null or application_deadline >= current_date);

  if not found then return jsonb_build_object('success', false, 'error', 'role_unavailable'); end if;
  if length(v_name) < 2 or length(v_name) > 160 then return jsonb_build_object('success', false, 'error', 'invalid_name'); end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('success', false, 'error', 'invalid_email'); end if;
  if length(v_phone) < 7 or length(v_phone) > 40 then return jsonb_build_object('success', false, 'error', 'invalid_phone'); end if;
  if length(v_summary) < 20 or length(v_summary) > 3000 then return jsonb_build_object('success', false, 'error', 'invalid_summary'); end if;
  if v_cv is not null and length(v_cv) > 1000 then return jsonb_build_object('success', false, 'error', 'invalid_cv_url'); end if;
  if v_linkedin is not null and length(v_linkedin) > 1000 then return jsonb_build_object('success', false, 'error', 'invalid_linkedin_url'); end if;

  select count(*) into v_recent
  from public.career_applications
  where lower(email) = v_email and role_id = v_role.id and created_at > now() - interval '24 hours';

  if v_recent > 0 then return jsonb_build_object('success', false, 'error', 'duplicate_recent_application'); end if;

  insert into public.career_applications (
    role_id, full_name, email, phone, location, summary, cv_url, linkedin_url,
    availability, expected_salary, source
  )
  values (
    v_role.id, v_name, v_email, v_phone, nullif(trim(coalesce(p_location, '')), ''),
    v_summary, v_cv, v_linkedin, nullif(trim(coalesce(p_availability, '')), ''),
    nullif(trim(coalesce(p_expected_salary, '')), ''),
    coalesce(nullif(trim(p_source), ''), 'website')
  )
  returning id into v_application_id;

  return jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'role', jsonb_build_object('id', v_role.id, 'title', v_role.title)
  );
end;
$$;

revoke all on function public.submit_career_application(uuid,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_career_application(uuid,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;

insert into public.career_roles
(title, department, location, employment_type, summary, description, responsibilities, requirements, status, sort_order)
select * from (values
(
 'Dispatch & Operations Coordinator','Operations','Nairobi, Kenya','Full-time',
 'Coordinate pickups, dispatch, delivery exceptions and proof-of-delivery workflows.',
 'Own the operational flow from pickup request through successful handover, keeping dispatch information accurate and customers informed.',
 '[ "Dispatch planning", "Customer communication", "Escalation handling", "Delivery tracking", "Daily reporting" ]'::jsonb,
 '[ "Strong organisation and follow-through", "Clear written and spoken communication", "Comfort with CRM and messaging tools", "Ability to work in a fast-moving delivery environment" ]'::jsonb,
 'draft',10
),
(
 'Customer Support Representative','Customer Experience','Nairobi, Kenya','Full-time / Contract',
 'Own customer conversations across WhatsApp, phone, email and digital channels.',
 'Help customers from booking through delivery, resolve issues quickly, and keep customer records accurate.',
 '[ "Customer support", "Issue resolution", "Booking assistance", "CRM updates", "Service follow-up" ]'::jsonb,
 '[ "Strong customer-service communication", "Calm problem solving", "Accurate record keeping", "Comfort with digital support tools" ]'::jsonb,
 'draft',20
),
(
 'Business Development Representative','Sales & Business Development','Nairobi, Kenya','Full-time / Commission',
 'Build Lueri''s B2B pipeline by developing relationships with businesses that need recurring delivery support.',
 'Identify qualified prospects, start commercial conversations, manage follow-up and hand qualified opportunities to account management.',
 '[ "Prospecting", "Outreach", "Lead qualification", "Meeting generation", "Pipeline follow-up" ]'::jsonb,
 '[ "Commercial communication skills", "Persistence and disciplined follow-up", "Interest in B2B sales", "Ability to understand customer needs" ]'::jsonb,
 'draft',30
)
) as v(title,department,location,employment_type,summary,description,responsibilities,requirements,status,sort_order)
where not exists (select 1 from public.career_roles r where r.title = v.title);

insert into public.career_roles
(title, department, location, employment_type, summary, description, responsibilities, requirements, status, sort_order)
select
'General / Future Opportunity','Talent Pool','Nairobi, Kenya','Future opportunity',
'Submit your CV for future recruitment opportunities at Lueri International.',
'Use this route when there is no current vacancy that matches your experience but you would like Lueri to consider you for future recruitment.',
'[ "Future recruitment matching", "Talent pool review" ]'::jsonb,
'[ "Clear communication", "Relevant experience", "Willingness to learn" ]'::jsonb,
'open',999
where not exists (select 1 from public.career_roles where title = 'General / Future Opportunity');

comment on table public.career_roles is 'Public recruitment catalogue. Only status=open roles are exposed to the public.';
comment on table public.career_applications is 'Private recruitment applications. Never expose directly to anon/authenticated clients; use staff-only access or server-side workflows.';
