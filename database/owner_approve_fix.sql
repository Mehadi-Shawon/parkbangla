-- Allow parking OWNER to also approve/reject reservations (not just manager/admin)
CREATE OR REPLACE FUNCTION manager_approve_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER; v_owner_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id, owner_id INTO v_mgr_id, v_owner_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() NOT IN (v_mgr_id, v_owner_id) AND get_my_role() != 'admin' THEN
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

CREATE OR REPLACE FUNCTION manager_reject_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_park_id INTEGER; v_mgr_id INTEGER; v_owner_id INTEGER;
BEGIN
  SELECT parking_id INTO v_park_id FROM public.reservations WHERE id = p_reservation_id;
  SELECT manager_id, owner_id INTO v_mgr_id, v_owner_id FROM public.parking_locations WHERE id = v_park_id;

  IF get_my_user_id() NOT IN (v_mgr_id, v_owner_id) AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.reservations
    SET status = 'cancelled'::reservation_status
    WHERE id = p_reservation_id AND status = 'pending'::reservation_status;
END;
$$;
