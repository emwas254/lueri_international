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
  v_ip text := public.request_ip();
  v_ip_recent integer;
begin
  select * into v_role from public.career_roles
  where id=p_role_id and status='open'
    and (application_deadline is null or application_deadline >= current_date);
  if not found then return jsonb_build_object('success',false,'error','role_unavailable'); end if;
  if length(v_name)<2 or length(v_name)>160 then return jsonb_build_object('success',false,'error','invalid_name'); end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('success',false,'error','invalid_email'); end if;
  if length(v_phone)<7 or length(v_phone)>40 then return jsonb_build_object('success',false,'error','invalid_phone'); end if;
  if length(v_summary)<20 or length(v_summary)>3000 then return jsonb_build_object('success',false,'error','invalid_summary'); end if;
  if v_cv is not null and (length(v_cv)>1000 or v_cv !~* '^https?://') then return jsonb_build_object('success',false,'error','invalid_cv_url'); end if;
  if v_linkedin is not null and (length(v_linkedin)>1000 or v_linkedin !~* '^https?://') then return jsonb_build_object('success',false,'error','invalid_linkedin_url'); end if;
  select count(*) into v_recent from public.career_applications
    where lower(email)=v_email and role_id=v_role.id and created_at>now()-interval '24 hours';
  if v_recent>0 then return jsonb_build_object('success',false,'error','duplicate_recent_application'); end if;
  select count(*) into v_ip_recent from public.rate_limit_events
    where bucket='career_application' and key=v_ip and at>now()-interval '1 hour';
  if v_ip_recent>=5 then return jsonb_build_object('success',false,'error','rate_limited'); end if;
  insert into public.rate_limit_events(bucket,key) values ('career_application',v_ip);
  insert into public.career_applications (
    role_id,full_name,email,phone,location,summary,cv_url,linkedin_url,availability,expected_salary,source
  ) values (
    v_role.id,v_name,v_email,v_phone,nullif(trim(coalesce(p_location,'')),''),v_summary,v_cv,v_linkedin,
    nullif(trim(coalesce(p_availability,'')),''),nullif(trim(coalesce(p_expected_salary,'')),''),coalesce(nullif(trim(p_source),''),'website')
  ) returning id into v_application_id;
  return jsonb_build_object('success',true,'application_id',v_application_id,'role',jsonb_build_object('id',v_role.id,'title',v_role.title));
end;
$$;

revoke all on function public.submit_career_application(uuid,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_career_application(uuid,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
