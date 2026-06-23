-- ============================================================
-- Run this in Supabase SQL Editor ONCE
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION owner_create_manager(
  p_name       TEXT,
  p_email      TEXT,
  p_password   TEXT,
  p_parking_id INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_id   UUID;
  v_user_id   INTEGER;
  v_hash      TEXT;
  v_owner_id  INTEGER;
BEGIN
  -- Verify caller owns this parking
  SELECT owner_id INTO v_owner_id FROM public.parking_locations WHERE id = p_parking_id;
  IF v_owner_id IS DISTINCT FROM get_my_user_id() THEN
    RAISE EXCEPTION 'Not authorized — you do not own this parking';
  END IF;

  -- Check email not already in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  END IF;

  -- Check email not already in public.users (orphan cleanup guard)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  END IF;

  v_auth_id := gen_random_uuid();
  v_hash    := crypt(p_password, gen_salt('bf', 6));

  -- Create Supabase auth user
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_auth_id, p_email, v_hash, NOW(),
    'authenticated', 'authenticated', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name, 'role', 'manager')
  );

  -- Create identity record (required for email/password login)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_email, v_auth_id,
    jsonb_build_object('sub', v_auth_id::text, 'email', p_email),
    'email', NOW(), NOW()
  );

  -- Create public user
  INSERT INTO public.users (auth_user_id, name, email, password, role, is_active, created_at)
  VALUES (v_auth_id, p_name, p_email, v_hash, 'manager', true, NOW())
  RETURNING id INTO v_user_id;

  -- Assign to parking
  UPDATE public.parking_locations SET manager_id = v_user_id WHERE id = p_parking_id;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION owner_create_manager(TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- ============================================================
-- Clean up any orphaned manager@demo.com records from testing
-- ============================================================
DO $$
DECLARE v_auth_id UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'manager@demo.com';
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_auth_id;
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
  DELETE FROM public.users WHERE email = 'manager@demo.com';
  UPDATE public.parking_locations SET manager_id = NULL
    WHERE manager_id NOT IN (SELECT id FROM public.users);
END;
$$;
