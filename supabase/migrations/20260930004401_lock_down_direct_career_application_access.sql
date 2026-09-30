drop policy if exists "deny direct public access to career applications" on public.career_applications;
create policy "deny direct public access to career applications"
on public.career_applications
for all
to anon, authenticated
using (false)
with check (false);