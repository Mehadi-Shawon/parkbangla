-- ============================================================
-- Fix: Cast text literals to reservation_status enum
-- Run in Supabase SQL Editor
-- ============================================================

-- Fix manager_approve_reservation
CREATE OR REPLACE FUNCTION manager_approve_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id INTO v_mgr_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() != v_mgr_id AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations
    SET status = 'confirmed'::reservation_status
    WHERE id = p_reservation_id AND status = 'pending'::reservation_status;

  UPDATE public.parking_locations
    SET available_slots = GREATEST(available_slots - 1, 0)
    WHERE id = v_park_id;
END;
$$;

-- Fix manager_reject_reservation
CREATE OR REPLACE FUNCTION manager_reject_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id INTO v_mgr_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() != v_mgr_id AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations
    SET status = 'cancelled'::reservation_status
    WHERE id = p_reservation_id AND status = 'pending'::reservation_status;
END;
$$;

-- Fix mark_entry
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
    SET status = 'active'::reservation_status, entry_time = NOW()
    WHERE id = p_reservation_id AND status = 'confirmed'::reservation_status;
END;
$$;

-- Fix mark_exit
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

  UPDATE public.reservations
    SET status = 'completed'::reservation_status, exit_time = NOW()
    WHERE id = p_reservation_id AND status = 'active'::reservation_status;

  UPDATE public.parking_locations
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = v_park_id;
END;
$$;

-- Fix cancel_reservation
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id INTEGER;
  v_res     reservations;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id AND user_id = v_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF v_res.status NOT IN ('pending'::reservation_status, 'confirmed'::reservation_status) THEN
    RAISE EXCEPTION 'Cannot cancel a % reservation', v_res.status;
  END IF;

  UPDATE public.reservations SET status = 'cancelled'::reservation_status WHERE id = p_reservation_id;
  UPDATE public.parking_locations
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = v_res.parking_id;
END;
$$;

-- Fix create_reservation initial status
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
  v_init_status reservation_status;
  v_reservation reservations;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT available_slots INTO v_avail FROM public.parking_locations WHERE id = p_parking_id FOR UPDATE;
  IF v_avail <= 0 THEN RAISE EXCEPTION 'No available slots'; END IF;

  SELECT (manager_id IS NOT NULL) INTO v_has_manager
    FROM public.parking_locations WHERE id = p_parking_id;

  v_init_status := CASE WHEN v_has_manager THEN 'pending'::reservation_status ELSE 'confirmed'::reservation_status END;

  INSERT INTO public.reservations
    (user_id, parking_id, vehicle_number, vehicle_type, start_time, end_time, total_amount, status, notes)
  VALUES
    (v_user_id, p_parking_id, p_vehicle_number, p_vehicle_type, p_start_time, p_end_time, p_total_amount, v_init_status, p_notes)
  RETURNING * INTO v_reservation;

  IF v_init_status = 'confirmed'::reservation_status THEN
    UPDATE public.parking_locations SET available_slots = available_slots - 1 WHERE id = p_parking_id;
  END IF;

  RETURN v_reservation;
END;
$$;
