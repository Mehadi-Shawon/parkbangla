-- ============================================================
-- ParkEasy – Create Manager Profile (server-side, no auth needed)
-- Run in Supabase SQL Editor
-- ============================================================

-- Creates the public.users record so when the manager
-- registers with the same email, they automatically get
-- manager role and are linked to the parking.
CREATE OR REPLACE FUNCTION public.create_manager_profile(
  p_name       TEXT,
  p_email      TEXT,
  p_parking_id INTEGER
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id INTEGER;
BEGIN
  -- Upsert: create profile or upgrade existing user to manager
  INSERT INTO public.users (name, email, password, role)
  VALUES (p_name, p_email, 'pending_activation', 'manager')
  ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        role = 'manager'
  RETURNING id INTO v_user_id;

  -- Link to parking
  UPDATE public.parking_locations
    SET manager_id = v_user_id
    WHERE id = p_parking_id;

  RETURN v_user_id;
END;
$$;
