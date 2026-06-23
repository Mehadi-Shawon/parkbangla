-- ============================================================
-- ParkEasy – Supabase Setup
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- -------------------------------------------------------
-- 1. Add auth_user_id column to link Supabase Auth → users
-- -------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- -------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER = bypasses RLS safely)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- -------------------------------------------------------
-- 3. Trigger: auto-create public.users on Supabase signup
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (name, email, phone, password, role, auth_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'supabase_auth',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver'),
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE SET auth_user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- 4. Enable Row Level Security
-- -------------------------------------------------------
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles          ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_select_own"        ON public.users;
DROP POLICY IF EXISTS "users_select_admin"       ON public.users;
DROP POLICY IF EXISTS "users_update_own"         ON public.users;
DROP POLICY IF EXISTS "users_update_admin"       ON public.users;
DROP POLICY IF EXISTS "parking_select"           ON public.parking_locations;
DROP POLICY IF EXISTS "parking_insert"           ON public.parking_locations;
DROP POLICY IF EXISTS "parking_update"           ON public.parking_locations;
DROP POLICY IF EXISTS "parking_delete"           ON public.parking_locations;
DROP POLICY IF EXISTS "reservations_select"      ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert"      ON public.reservations;
DROP POLICY IF EXISTS "reservations_update"      ON public.reservations;
DROP POLICY IF EXISTS "vehicles_all"             ON public.vehicles;

-- USERS
CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "users_select_admin" ON public.users FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE USING (get_my_role() = 'admin');

-- PARKING LOCATIONS
CREATE POLICY "parking_select" ON public.parking_locations FOR SELECT USING (
  status = 'approved' OR owner_id = get_my_user_id() OR get_my_role() = 'admin'
);
CREATE POLICY "parking_insert" ON public.parking_locations FOR INSERT WITH CHECK (
  owner_id = get_my_user_id() AND get_my_role() = 'owner'
);
CREATE POLICY "parking_update" ON public.parking_locations FOR UPDATE USING (
  owner_id = get_my_user_id() OR get_my_role() = 'admin'
);
CREATE POLICY "parking_delete" ON public.parking_locations FOR DELETE USING (
  owner_id = get_my_user_id() OR get_my_role() = 'admin'
);

-- RESERVATIONS
CREATE POLICY "reservations_select" ON public.reservations FOR SELECT USING (
  user_id = get_my_user_id() OR
  parking_id IN (SELECT id FROM parking_locations WHERE owner_id = get_my_user_id()) OR
  get_my_role() = 'admin'
);
CREATE POLICY "reservations_insert" ON public.reservations FOR INSERT WITH CHECK (
  user_id = get_my_user_id()
);
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE USING (
  user_id = get_my_user_id() OR
  parking_id IN (SELECT id FROM parking_locations WHERE owner_id = get_my_user_id()) OR
  get_my_role() = 'admin'
);

-- VEHICLES
CREATE POLICY "vehicles_all" ON public.vehicles FOR ALL USING (user_id = get_my_user_id());

-- -------------------------------------------------------
-- 5. Stored Procedures (atomic operations)
-- -------------------------------------------------------

-- Create reservation (atomic: insert + decrement slot)
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
  v_reservation reservations;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT available_slots INTO v_avail FROM public.parking_locations WHERE id = p_parking_id FOR UPDATE;
  IF v_avail <= 0 THEN RAISE EXCEPTION 'No available slots'; END IF;

  INSERT INTO public.reservations
    (user_id, parking_id, vehicle_number, vehicle_type, start_time, end_time, total_amount, status, notes)
  VALUES
    (v_user_id, p_parking_id, p_vehicle_number, p_vehicle_type, p_start_time, p_end_time, p_total_amount, 'confirmed', p_notes)
  RETURNING * INTO v_reservation;

  UPDATE public.parking_locations SET available_slots = available_slots - 1 WHERE id = p_parking_id;
  RETURN v_reservation;
END;
$$;

-- Cancel reservation (atomic: update status + restore slot)
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id INTEGER;
  v_res     reservations;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid();
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id AND user_id = v_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF v_res.status NOT IN ('pending','confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel a % reservation', v_res.status;
  END IF;

  UPDATE public.reservations SET status = 'cancelled' WHERE id = p_reservation_id;
  UPDATE public.parking_locations
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = v_res.parking_id;
END;
$$;

-- Mark vehicle entry
CREATE OR REPLACE FUNCTION mark_entry(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_owner_id INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id
    FROM public.parking_locations pl
    JOIN public.reservations r ON r.parking_id = pl.id
    WHERE r.id = p_reservation_id;

  IF get_my_user_id() != v_owner_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.reservations
    SET status = 'active', entry_time = NOW()
    WHERE id = p_reservation_id AND status = 'confirmed';
END;
$$;

-- Mark vehicle exit
CREATE OR REPLACE FUNCTION mark_exit(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id INTEGER;
  v_park_id  INTEGER;
BEGIN
  SELECT pl.owner_id, pl.id INTO v_owner_id, v_park_id
    FROM public.parking_locations pl
    JOIN public.reservations r ON r.parking_id = pl.id
    WHERE r.id = p_reservation_id;

  IF get_my_user_id() != v_owner_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.reservations
    SET status = 'completed', exit_time = NOW()
    WHERE id = p_reservation_id AND status = 'active';

  UPDATE public.parking_locations
    SET available_slots = LEAST(available_slots + 1, total_slots)
    WHERE id = v_park_id;
END;
$$;
