-- ============================================================
-- ParkEasy – Complete Schema (PostgreSQL / Supabase)
-- Run this in: Supabase Dashboard → SQL Editor
-- Safe to run on existing databases (uses IF NOT EXISTS + ALTER)
-- ============================================================

-- Required extension for password hashing in owner_create_manager
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- Enum types (add 'manager' to existing enum if needed)
-- -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('driver', 'owner', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
END $$;

DO $$ BEGIN
  CREATE TYPE parking_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'van', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- -------------------------------------------------------
-- Trigger helper for updated_at
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- Table: users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id           SERIAL        PRIMARY KEY,
    auth_user_id UUID          UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name         VARCHAR(100)  NOT NULL,
    email        VARCHAR(100)  UNIQUE NOT NULL,
    phone        VARCHAR(20),
    password     VARCHAR(255),
    role         user_role     NOT NULL DEFAULT 'driver',
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    avatar       VARCHAR(500),
    created_at   TIMESTAMPTZ   DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- Migrate existing schema: add auth_user_id and make password nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- Trigger: auto-create public.users row on Supabase Auth signup
-- This fires every time a user registers through supabase.auth.signUp()
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')::user_role
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id,
        name = COALESCE(EXCLUDED.name, users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -------------------------------------------------------
-- Table: vehicles
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id             SERIAL       PRIMARY KEY,
    user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(20)  NOT NULL,
    vehicle_type   vehicle_type DEFAULT 'car',
    make           VARCHAR(100),
    model          VARCHAR(100),
    color          VARCHAR(50),
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, vehicle_number)
);

-- -------------------------------------------------------
-- Table: parking_locations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_locations (
    id               SERIAL         PRIMARY KEY,
    owner_id         INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id       INTEGER        REFERENCES users(id) ON DELETE SET NULL,
    name             VARCHAR(200)   NOT NULL,
    address          TEXT           NOT NULL,
    city             VARCHAR(100),
    state            VARCHAR(100),
    latitude         DECIMAL(10,8)  NOT NULL,
    longitude        DECIMAL(11,8)  NOT NULL,
    total_slots      INTEGER        NOT NULL DEFAULT 0,
    available_slots  INTEGER        NOT NULL DEFAULT 0,
    hourly_rate      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    description      TEXT,
    amenities        JSONB,
    images           JSONB,
    opening_time     TIME           DEFAULT '00:00:00',
    closing_time     TIME           DEFAULT '23:59:59',
    status           parking_status DEFAULT 'pending',
    created_at       TIMESTAMPTZ    DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    DEFAULT NOW()
);

-- Migrate: add manager_id if missing
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_parking_updated_at ON parking_locations;
CREATE TRIGGER trg_parking_updated_at
  BEFORE UPDATE ON parking_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- Table: reservations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
    id              SERIAL             PRIMARY KEY,
    user_id         INTEGER            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parking_id      INTEGER            NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    vehicle_number  VARCHAR(20)        NOT NULL,
    vehicle_type    VARCHAR(50),
    start_time      TIMESTAMPTZ        NOT NULL,
    end_time        TIMESTAMPTZ        NOT NULL,
    total_amount    DECIMAL(10,2),
    status          reservation_status DEFAULT 'pending',
    entry_time      TIMESTAMPTZ,
    exit_time       TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ        DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- Table: activity_logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id          SERIAL       PRIMARY KEY,
    actor_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    meta        JSONB        DEFAULT '{}',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_auth_id    ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_parking_status   ON parking_locations(status);
CREATE INDEX IF NOT EXISTS idx_parking_owner    ON parking_locations(owner_id);
CREATE INDEX IF NOT EXISTS idx_parking_manager  ON parking_locations(manager_id);
CREATE INDEX IF NOT EXISTS idx_parking_location ON parking_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reservation_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_park ON reservations(parking_id);
CREATE INDEX IF NOT EXISTS idx_reservation_stat ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_user    ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_actor   ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Without these policies Supabase blocks ALL table access
-- ============================================================

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs     ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies cleanly
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Helpers so policies stay readable
CREATE OR REPLACE FUNCTION my_user_id()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid()
$$;

-- USERS: readable by everyone (needed for joins); writable by trigger & self
CREATE POLICY "users_read_all"   ON users FOR SELECT USING (true);
CREATE POLICY "users_insert"     ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (
  auth.uid() = auth_user_id OR my_role() = 'admin'
);

-- VEHICLES: drivers manage their own vehicles only
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (user_id = my_user_id());
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (user_id = my_user_id());
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE USING (user_id = my_user_id());
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE USING (user_id = my_user_id());

-- PARKING LOCATIONS: all can read; owners manage theirs; managers update theirs; admin manages all
CREATE POLICY "parking_read_all"    ON parking_locations FOR SELECT USING (true);
CREATE POLICY "parking_insert_owner" ON parking_locations FOR INSERT WITH CHECK (
  owner_id = my_user_id()
);
CREATE POLICY "parking_update" ON parking_locations FOR UPDATE USING (
  owner_id    = my_user_id() OR
  manager_id  = my_user_id() OR
  my_role()   = 'admin'
);
CREATE POLICY "parking_delete" ON parking_locations FOR DELETE USING (
  owner_id = my_user_id() OR my_role() = 'admin'
);

-- RESERVATIONS: drivers see own; owners/managers see their parking's reservations; admin sees all
CREATE POLICY "reservations_read" ON reservations FOR SELECT USING (
  user_id   = my_user_id() OR
  my_role() = 'admin'      OR
  EXISTS (
    SELECT 1 FROM parking_locations pl
    WHERE pl.id = reservations.parking_id
      AND (pl.owner_id = my_user_id() OR pl.manager_id = my_user_id())
  )
);
CREATE POLICY "reservations_insert" ON reservations FOR INSERT WITH CHECK (
  user_id = my_user_id()
);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE USING (
  user_id   = my_user_id() OR
  my_role() = 'admin'      OR
  EXISTS (
    SELECT 1 FROM parking_locations pl
    WHERE pl.id = reservations.parking_id
      AND (pl.owner_id = my_user_id() OR pl.manager_id = my_user_id())
  )
);

-- ACTIVITY LOGS: actors see their own; owners and admins see all
CREATE POLICY "activity_read" ON activity_logs FOR SELECT USING (
  actor_id  = my_user_id() OR my_role() IN ('admin', 'owner')
);
CREATE POLICY "activity_insert" ON activity_logs FOR INSERT WITH CHECK (
  actor_id = my_user_id()
);

-- ============================================================
-- RPC FUNCTIONS (called by frontend via supabase.rpc(...))
-- All use SECURITY DEFINER so they bypass RLS safely
-- ============================================================

-- 1. create_reservation – driver books a parking slot
CREATE OR REPLACE FUNCTION create_reservation(
  p_parking_id     INTEGER,
  p_vehicle_number TEXT,
  p_vehicle_type   TEXT,
  p_start_time     TIMESTAMPTZ,
  p_end_time       TIMESTAMPTZ,
  p_total_amount   NUMERIC,
  p_notes          TEXT DEFAULT NULL
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id INTEGER;
  v_resv_id INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO reservations
    (user_id, parking_id, vehicle_number, vehicle_type, start_time, end_time, total_amount, notes)
  VALUES
    (v_user_id, p_parking_id, UPPER(p_vehicle_number), p_vehicle_type,
     p_start_time, p_end_time, p_total_amount, p_notes)
  RETURNING id INTO v_resv_id;

  UPDATE parking_locations
  SET available_slots = GREATEST(available_slots - 1, 0)
  WHERE id = p_parking_id;

  RETURN v_resv_id;
END;
$$;

-- 2. cancel_reservation – driver cancels their own reservation
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    INTEGER;
  v_parking_id INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();

  SELECT parking_id INTO v_parking_id
  FROM reservations
  WHERE id = p_reservation_id
    AND user_id = v_user_id
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found or cannot be cancelled';
  END IF;

  UPDATE reservations SET status = 'cancelled' WHERE id = p_reservation_id;
  UPDATE parking_locations SET available_slots = available_slots + 1 WHERE id = v_parking_id;
END;
$$;

-- 3. manager_approve_reservation
CREATE OR REPLACE FUNCTION manager_approve_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reservations SET status = 'confirmed'
  WHERE id = p_reservation_id AND status = 'pending';
END;
$$;

-- 4. manager_reject_reservation
CREATE OR REPLACE FUNCTION manager_reject_reservation(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_parking_id INTEGER;
BEGIN
  SELECT parking_id INTO v_parking_id FROM reservations
  WHERE id = p_reservation_id AND status = 'pending';

  UPDATE reservations SET status = 'cancelled' WHERE id = p_reservation_id;

  IF v_parking_id IS NOT NULL THEN
    UPDATE parking_locations
    SET available_slots = available_slots + 1 WHERE id = v_parking_id;
  END IF;
END;
$$;

-- 5. mark_entry – manager marks a vehicle has entered
CREATE OR REPLACE FUNCTION mark_entry(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reservations
  SET status = 'active', entry_time = NOW()
  WHERE id = p_reservation_id AND status = 'confirmed';
END;
$$;

-- 6. mark_exit – manager marks a vehicle has exited
CREATE OR REPLACE FUNCTION mark_exit(p_reservation_id INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_parking_id INTEGER;
BEGIN
  SELECT parking_id INTO v_parking_id FROM reservations
  WHERE id = p_reservation_id AND status = 'active';

  UPDATE reservations
  SET status = 'completed', exit_time = NOW()
  WHERE id = p_reservation_id AND status = 'active';

  IF v_parking_id IS NOT NULL THEN
    UPDATE parking_locations
    SET available_slots = available_slots + 1 WHERE id = v_parking_id;
  END IF;
END;
$$;

-- 7. owner_create_manager
--    Creates a Supabase Auth user (email pre-confirmed) with role=manager,
--    auto-creates their public.users profile via the trigger, then assigns
--    them to the specified parking location.
CREATE OR REPLACE FUNCTION owner_create_manager(
  p_name       TEXT,
  p_email      TEXT,
  p_password   TEXT,
  p_parking_id INTEGER
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_id    UUID := gen_random_uuid();
  v_profile_id INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(p_email)) THEN
    RAISE EXCEPTION 'Email % is already registered', p_email;
  END IF;

  -- Create Supabase Auth user with email pre-confirmed so they can login immediately
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_auth_id, 'authenticated', 'authenticated',
    LOWER(p_email),
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('name', p_name, 'role', 'manager')::jsonb,
    NOW(), NOW(),
    '', '', '', ''
  );

  -- The trigger fires synchronously and creates the public.users row
  SELECT id INTO v_profile_id FROM public.users WHERE auth_user_id = v_auth_id;

  -- Safety fallback if somehow the row isn't there yet
  IF v_profile_id IS NULL THEN
    INSERT INTO public.users (auth_user_id, name, email, role)
    VALUES (v_auth_id, p_name, LOWER(p_email), 'manager')
    ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
    RETURNING id INTO v_profile_id;
  END IF;

  -- Assign to the parking location
  UPDATE parking_locations SET manager_id = v_profile_id WHERE id = p_parking_id;

  RETURN json_build_object('success', true, 'manager_id', v_profile_id);
END;
$$;
