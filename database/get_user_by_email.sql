-- ============================================================
-- Helper: look up a user's integer ID by email
-- SECURITY DEFINER bypasses RLS so the owner's session
-- can find the newly created manager's record.
-- Run in Supabase SQL Editor.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM users WHERE email = p_email LIMIT 1
$$;
