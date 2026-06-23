-- ============================================================
-- ParkEasy – Manager Role Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add 'manager' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';

-- 2. Add manager_id to parking_locations
ALTER TABLE public.parking_locations
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parking_manager ON public.parking_locations(manager_id);

-- 3. Helper: check if current user is manager of a parking
CREATE OR REPLACE FUNCTION public.is_my_managed_parking(p_parking_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM parking_locations
    WHERE id = p_parking_id AND manager_id = get_my_user_id()
  )
$$;

-- 4. Update RLS policies to include manager access
-- Parking: managers can SELECT and UPDATE their assigned location
DROP POLICY IF EXISTS "parking_select" ON public.parking_locations;
CREATE POLICY "parking_select" ON public.parking_locations FOR SELECT USING (
  status = 'approved'
  OR owner_id   = get_my_user_id()
  OR manager_id = get_my_user_id()
  OR get_my_role() = 'admin'
);

DROP POLICY IF EXISTS "parking_update" ON public.parking_locations;
CREATE POLICY "parking_update" ON public.parking_locations FOR UPDATE USING (
  owner_id   = get_my_user_id()
  OR manager_id = get_my_user_id()
  OR get_my_role() = 'admin'
);

-- Reservations: managers can SELECT and UPDATE for their parking
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
CREATE POLICY "reservations_select" ON public.reservations FOR SELECT USING (
  user_id    = get_my_user_id()
  OR parking_id IN (SELECT id FROM parking_locations WHERE owner_id   = get_my_user_id())
  OR parking_id IN (SELECT id FROM parking_locations WHERE manager_id = get_my_user_id())
  OR get_my_role() = 'admin'
);

DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE USING (
  user_id    = get_my_user_id()
  OR parking_id IN (SELECT id FROM parking_locations WHERE owner_id   = get_my_user_id())
  OR parking_id IN (SELECT id FROM parking_locations WHERE manager_id = get_my_user_id())
  OR get_my_role() = 'admin'
);

-- 5. Update mark_entry / mark_exit stored procs to also allow managers
CREATE OR REPLACE FUNCTION mark_entry(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;

  IF NOT (
    EXISTS (SELECT 1 FROM public.parking_locations WHERE id = v_park_id AND owner_id   = get_my_user_id()) OR
    EXISTS (SELECT 1 FROM public.parking_locations WHERE id = v_park_id AND manager_id = get_my_user_id())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations
    SET status = 'active', entry_time = NOW()
    WHERE id = p_reservation_id AND status = 'confirmed';
END;
$$;

CREATE OR REPLACE FUNCTION mark_exit(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;

  IF NOT (
    EXISTS (SELECT 1 FROM public.parking_locations WHERE id = v_park_id AND owner_id   = get_my_user_id()) OR
    EXISTS (SELECT 1 FROM public.parking_locations WHERE id = v_park_id AND manager_id = get_my_user_id())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations SET status = 'completed', exit_time = NOW()
    WHERE id = p_reservation_id AND status = 'active';

  UPDATE public.parking_locations
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = v_park_id;
END;
$$;
