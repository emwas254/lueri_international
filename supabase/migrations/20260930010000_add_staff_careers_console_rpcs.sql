create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'admin'
  );
$$;

create or replace function public.staff_list_career_applications(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_rows json; v_limit integer := least(greatest(coalesce(p_limit,100),1),200); v_offset integer := greatest(coalesce(p_offset,0),0);
begin
  if not public.is_staff() then return json_build_object('success',false,'error','not_authorized'); end if;
  select coalesce(json_agg(row_to_json(t) order by t.created_at desc),'[]'::json) into v_rows
  from (
    select a.id,a.role_id,r.title as role_title,r.department,a.full_name,a.email,a.phone,a.location,
           a.summary,a.cv_url,a.linkedin_url,a.availability,a.expected_salary,a.source,a.status,a.created_at,a.updated_at
    from public.career_applications a join public.career_roles r on r.id=a.role_id
    where (p_status is null or p_status='' or a.status=p_status)
    order by a.created_at desc limit v_limit offset v_offset
  ) t;
  return json_build_object('success',true,'applications',v_rows);
end;
$$;

create or replace function public.staff_update_career_application(p_application_id uuid,p_status text,p_note text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.career_applications%rowtype;
begin
  if not public.is_staff() then return json_build_object('success',false,'error','not_authorized'); end if;
  if p_status not in ('new','reviewing','shortlisted','interview','rejected','hired','withdrawn') then return json_build_object('success',false,'error','invalid_status'); end if;
  update public.career_applications set status=p_status,updated_at=now() where id=p_application_id returning * into v_row;
  if not found then return json_build_object('success',false,'error','application_not_found'); end if;
  return json_build_object('success',true,'application',json_build_object('id',v_row.id,'status',v_row.status,'updated_at',v_row.updated_at));
end;
$$;

create or replace function public.staff_list_career_roles()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then return json_build_object('success',false,'error','not_authorized'); end if;
  return json_build_object('success',true,'roles',coalesce((
    select json_agg(row_to_json(x) order by x.sort_order)
    from (
      select id,title,department,location,employment_type,summary,description,responsibilities,requirements,
             salary_range,application_deadline,status,sort_order,created_at,updated_at
      from public.career_roles
    ) x
  ),'[]'::json));
end;
$$;

create or replace function public.staff_set_career_role_status(p_role_id uuid,p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_role public.career_roles%rowtype;
begin
  if not public.is_admin() then return json_build_object('success',false,'error','admin_required'); end if;
  if p_status not in ('draft','open','closed') then return json_build_object('success',false,'error','invalid_status'); end if;
  update public.career_roles set status=p_status,updated_at=now() where id=p_role_id returning * into v_role;
  if not found then return json_build_object('success',false,'error','role_not_found'); end if;
  return json_build_object('success',true,'role',json_build_object('id',v_role.id,'title',v_role.title,'status',v_role.status));
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.staff_list_career_applications(text,integer,integer) from public;
grant execute on function public.staff_list_career_applications(text,integer,integer) to authenticated;
revoke all on function public.staff_update_career_application(uuid,text,text) from public;
grant execute on function public.staff_update_career_application(uuid,text,text) to authenticated;
revoke all on function public.staff_list_career_roles() from public;
grant execute on function public.staff_list_career_roles() to authenticated;
revoke all on function public.staff_set_career_role_status(uuid,text) from public;
grant execute on function public.staff_set_career_role_status(uuid,text) to authenticated;
