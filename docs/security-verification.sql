-- Lueri security verification pack
-- READ-ONLY ONLY. Run manually in the Supabase SQL Editor against the intended project.
-- These statements inspect catalog metadata and do not alter data, policies, grants, or schema.
-- Do not treat a catalog result as proof of production behavior unless the project/environment is confirmed.

-- A1. Does anon have EXECUTE on lookup_member(phone), and what result columns are declared?
-- PASS: either the function is absent / anon cannot execute it, OR the returned fields are explicitly
-- reviewed and safe to disclose publicly. A function that returns member PII is not a pass.
WITH f AS (
  SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
         pg_get_function_result(p.oid) AS result_type, p.proargnames, p.proargmodes,
         p.proallargtypes, p.proargtypes, p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'lookup_member'
)
SELECT nspname, proname, identity_args, result_type, proargnames, proargmodes,
       has_function_privilege('anon', oid, 'EXECUTE') AS anon_can_execute,
       proacl
FROM f;

-- A2. For SETOF/composite/table-returning functions, list the declared OUT/TABLE columns.
-- PASS: each returned column is known and appropriate for the least-privileged caller.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       p.proargnames[i] AS output_column,
       p.proallargtypes[i]::regtype::text AS output_type,
       p.proargmodes[i] AS argument_mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL generate_subscripts(p.proargnames, 1) AS g(i)
WHERE n.nspname = 'public'
  AND p.proname = 'lookup_member'
  AND p.proargmodes[i] IN ('o','b','t')
ORDER BY g.i;

-- B. Which ordinary/partitioned tables in public do not have RLS enabled?
-- PASS: zero rows, or every exception is intentionally documented and risk-accepted.
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relkind,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND NOT c.relrowsecurity
ORDER BY c.relname;

-- C. Policies on the requested sensitive/business tables.
-- PASS: policies are present and align with intended role boundaries; no broad anon/authenticated
-- policy permits reading or changing another customer's records.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('members','rewards_transactions','payments','bookings','organizations','profiles')
ORDER BY tablename, policyname;

-- D1. Discover approval/status fields and relevant policies for staff approval workflows.
-- PASS: approval writes are constrained by server/database authorization, not only hidden UI controls.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%approv%' OR column_name ILIKE '%review%' OR column_name ILIKE '%status%'
       OR column_name ILIKE '%staff%' OR column_name ILIKE '%verified%')
ORDER BY table_name, ordinal_position;

-- D2. Policies mentioning staff/approval and the career application table's policy coverage.
-- PASS: privileged approval actions require a trusted staff/admin identity in a database-enforced path.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename ILIKE '%career%' OR tablename ILIKE '%application%'
       OR policyname ILIKE '%staff%' OR coalesce(qual,'') ILIKE '%staff%'
       OR coalesce(with_check,'') ILIKE '%staff%'
       OR coalesce(qual,'') ILIKE '%approv%'
       OR coalesce(with_check,'') ILIKE '%approv%')
ORDER BY tablename, policyname;

-- D3. SECURITY DEFINER functions that appear to implement staff/approval operations.
-- PASS: each sensitive function checks trusted staff authorization server-side and pins search_path.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       prosecdef AS security_definer,
       p.proconfig AS function_settings,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%staff%' OR p.proname ILIKE '%approv%' OR p.proname ILIKE '%career%')
ORDER BY p.proname;

-- E. All SECURITY DEFINER functions executable by anon or authenticated, with search_path pin status.
-- PASS: each exposed function is intentionally callable, has least-privilege grants, and pins
-- search_path (for example, a proconfig setting beginning with search_path=); investigate every
-- row without a pinned search_path. A null ACL is not itself proof of safety; privilege checks below
-- resolve effective grants including PostgreSQL defaults.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       pg_get_function_result(p.oid) AS result_type,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       p.proconfig AS function_settings,
       EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS setting
         WHERE setting ILIKE 'search_path=%'
       ) AS search_path_is_pinned,
       p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
ORDER BY n.nspname, p.proname, identity_args;

-- F. Effective direct table privileges for anon/authenticated on the six named tables.
-- PASS: only intended SELECT/INSERT/UPDATE/DELETE privileges are granted; RLS policies must still
-- be inspected because table grants alone do not define row-level access.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('members','rewards_transactions','payments','bookings','organizations','profiles')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;
