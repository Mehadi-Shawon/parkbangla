-- ============================================================
-- ParkEasy – Manager Approval Flow
-- Run in Supabase SQL Editor AFTER manager_setup.sql
-- ============================================================

-- Update create_reservation: set 'pending' if parking has a manager, else 'confirmed'
CREATE OR REPLACE FUNCTION create_reservation(
  p_parking_id    INTEGER,
  p_vehicle_number TEXT,
  p_vehicle_type  TEXT,
  p_start_time    TIMESTAMPTZ,
  p_end_time      TIMESTAMPTZ,
  p_total_amount  DECIMAL,
  p_notes         TEXT DEFAULT NULL
) RETURNS reservations LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id     INTEGER;
  v_avail       INTEGER;
  v_has_manager BOOLEAN;
  v_init_status TEXT;
  v_reservation reservations;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT available_slots INTO v_avail FROM public.parking_locations WHERE id = p_parking_id FOR UPDATE;
  IF v_avail <= 0 THEN RAISE EXCEPTION 'No available slots'; END IF;

  -- If parking has a manager, reservation starts as pending (needs approval)
  SELECT (manager_id IS NOT NULL) INTO v_has_manager
    FROM public.parking_locations WHERE id = p_parking_id;

  v_init_status := CASE WHEN v_has_manager THEN 'pending' ELSE 'confirmed' END;

  INSERT INTO public.reservations
    (user_id, parking_id, vehicle_number, vehicle_type, start_time, end_time, total_amount, status, notes)
  VALUES
    (v_user_id, p_parking_id, p_vehicle_number, p_vehicle_type, p_start_time, p_end_time, p_total_amount, v_init_status, p_notes)
  RETURNING * INTO v_reservation;

  -- Only decrement slots for confirmed (no manager) flow
  -- For pending flow, slots are decremented upon manager approval
  IF v_init_status = 'confirmed' THEN
    UPDATE public.parking_locations SET available_slots = available_slots - 1 WHERE id = p_parking_id;
  END IF;

  RETURN v_reservation;
END;
$$;

-- Manager approve reservation
CREATE OR REPLACE FUNCTION manager_approve_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id INTO v_mgr_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() != v_mgr_id AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations SET status = 'confirmed' WHERE id = p_reservation_id AND status = 'pending';
  UPDATE public.parking_locations
    SET available_slots = GREATEST(available_slots - 1, 0)
    WHERE id = v_park_id;
END;
$$;

-- Manager reject reservation
CREATE OR REPLACE FUNCTION manager_reject_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id INTO v_mgr_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() != v_mgr_id AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations SET status = 'cancelled' WHERE id = p_reservation_id AND status = 'pending';
END;
$$;

-- Update RLS: managers can also approve/reject
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE USING (
  user_id = get_my_user_id() OR
  parking_id IN (SELECT id FROM parking_locations WHERE owner_id   = get_my_user_id()) OR
  parking_id IN (SELECT id FROM parking_locations WHERE manager_id = get_my_user_id()) OR
  get_my_role() = 'admin'
);
