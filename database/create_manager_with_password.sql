-- ============================================================
-- ParkEasy – Create Manager With Password (One-Step)
-- Run in Supabase SQL Editor

-- Enable pgcrypto for password hashing (run this first)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- This function creates both the Supabase Auth account AND
-- the public.users profile in a single server-side call.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_manager_with_password(
  p_name       TEXT,
  p_email      TEXT,
  p_password   TEXT,
  p_parking_id INTEGER
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_auth_id UUID;
  v_user_id INTEGER;
BEGIN
  -- 1. Check if email already exists in auth.users
  SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_auth_id IS NULL THEN
    -- Create new Supabase Auth user
    v_auth_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', p_name, 'role', 'manager'),
      false, '', '', '', ''
    );

    -- Create auth identity (required for email login)
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data,
      provider, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), p_email, v_auth_id,
      jsonb_build_object('sub', v_auth_id::text, 'email', p_email),
      'email', NOW(), NOW(), NOW()
    );
  ELSE
    -- Update existing auth user's password
    UPDATE auth.users
      SET encrypted_password = crypt(p_password, gen_salt('bf')),
          updated_at = NOW()
      WHERE id = v_auth_id;
  END IF;

  -- 2. Create or update public.users record
  INSERT INTO public.users (name, email, password, role, auth_user_id)
  VALUES (p_name, p_email, 'supabase_auth', 'manager', v_auth_id)
  ON CONFLICT (email) DO UPDATE
    SET name         = EXCLUDED.name,
        role         = 'manager',
        auth_user_id = v_auth_id
  RETURNING id INTO v_user_id;

  -- 3. Assign manager to parking
  UPDATE public.parking_locations
    SET manager_id = v_user_id
    WHERE id = p_parking_id;

  RETURN v_user_id;
END;
$$;
