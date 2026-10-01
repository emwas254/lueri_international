-- Senior-engineering hardening.
-- 1. Synchronize the identity sequence to the existing member-number ceiling.
-- 2. Pin SECURITY DEFINER get_plan() to a deterministic search_path.
-- 3. Remove the MAX(member_no)+1 concurrency race from register_member().

SELECT setval(
  'public.members_member_no_seq',
  GREATEST(COALESCE((SELECT MAX(member_no) FROM public.members), 0), 1),
  true
);

ALTER FUNCTION public.get_plan(text)
  SET search_path = public;

CREATE OR REPLACE FUNCTION public.register_member(
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_member_no BIGINT;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required.');
  END IF;

  IF p_phone !~ '^254[71][0-9]{8}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid Kenyan phone number.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.members WHERE phone = p_phone) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A rewards member already exists with this phone number.'
    );
  END IF;

  INSERT INTO public.members (
    full_name,
    phone,
    email,
    tier,
    points,
    lifetime_spend
  )
  VALUES (
    btrim(p_name),
    p_phone,
    NULLIF(btrim(COALESCE(p_email,'')), ''),
    'bronze',
    0,
    0
  )
  RETURNING id, member_no INTO v_member_id, v_member_no;

  RETURN jsonb_build_object(
    'success', true,
    'member', jsonb_build_object(
      'id', v_member_id,
      'name', btrim(p_name),
      'phone', p_phone,
      'email', NULLIF(btrim(COALESCE(p_email,'')), ''),
      'memberNumber', v_member_no,
      'tier', 'bronze',
      'points', 0,
      'lifetimeSpend', 0
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A rewards member already exists with this phone number.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
END;
$function$;
