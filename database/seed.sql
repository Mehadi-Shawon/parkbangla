-- ============================================================
-- ParkEasy – Seed Data (PostgreSQL / Supabase)
-- Run this AFTER schema.sql in Supabase SQL Editor
--
-- This creates demo Supabase Auth users so they can log in:
--   admin@parkeasy.com   / password123  (admin)
--   owner1@example.com   / password123  (owner)
--   owner2@example.com   / password123  (owner)
--   alice@example.com    / password123  (driver)
--   bob@example.com      / password123  (driver)
--   carol@example.com    / password123  (driver)
-- ============================================================

DO $$
DECLARE
  -- Auth UUIDs for each demo user
  v_admin_uid  UUID := gen_random_uuid();
  v_alice_uid  UUID := gen_random_uuid();
  v_bob_uid    UUID := gen_random_uuid();
  v_carol_uid  UUID := gen_random_uuid();
  v_owner1_uid UUID := gen_random_uuid();
  v_owner2_uid UUID := gen_random_uuid();

  -- public.users integer ids (populated after trigger fires)
  v_alice_id  INTEGER;
  v_bob_id    INTEGER;
  v_carol_id  INTEGER;
  v_owner1_id INTEGER;
  v_owner2_id INTEGER;

  -- Parking location ids
  v_park1_id  INTEGER;
  v_park2_id  INTEGER;
  v_park3_id  INTEGER;
  v_park4_id  INTEGER;
  v_park5_id  INTEGER;
  v_park6_id  INTEGER;
  v_park7_id  INTEGER;
BEGIN

  -- -------------------------------------------------------
  -- 1. Create Supabase Auth users (email_confirmed_at = NOW()
  --    so they can log in immediately without email confirmation)
  --    The handle_new_auth_user trigger auto-creates public.users rows.
  -- -------------------------------------------------------
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin_uid,
     'authenticated', 'authenticated', 'admin@parkeasy.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"System Admin","role":"admin"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', v_alice_uid,
     'authenticated', 'authenticated', 'alice@example.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Alice Johnson","role":"driver"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', v_bob_uid,
     'authenticated', 'authenticated', 'bob@example.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Bob Smith","role":"driver"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', v_carol_uid,
     'authenticated', 'authenticated', 'carol@example.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"Carol White","role":"driver"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', v_owner1_uid,
     'authenticated', 'authenticated', 'owner1@example.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"ParkPro Inc.","role":"owner"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', v_owner2_uid,
     'authenticated', 'authenticated', 'owner2@example.com',
     crypt('password123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     '{"name":"CityPark Ltd.","role":"owner"}'::jsonb,
     NOW(), NOW(), '', '', '', '')

  ON CONFLICT (email) DO NOTHING;

  -- -------------------------------------------------------
  -- 2. Update phone numbers on the auto-created profile rows
  -- -------------------------------------------------------
  UPDATE users SET phone = '+1-555-0100' WHERE email = 'admin@parkeasy.com';
  UPDATE users SET phone = '+1-555-0101' WHERE email = 'alice@example.com';
  UPDATE users SET phone = '+1-555-0102' WHERE email = 'bob@example.com';
  UPDATE users SET phone = '+1-555-0103' WHERE email = 'carol@example.com';
  UPDATE users SET phone = '+1-555-0200' WHERE email = 'owner1@example.com';
  UPDATE users SET phone = '+1-555-0201' WHERE email = 'owner2@example.com';

  -- -------------------------------------------------------
  -- 3. Capture integer IDs for FK references below
  -- -------------------------------------------------------
  SELECT id INTO v_alice_id  FROM users WHERE email = 'alice@example.com';
  SELECT id INTO v_bob_id    FROM users WHERE email = 'bob@example.com';
  SELECT id INTO v_carol_id  FROM users WHERE email = 'carol@example.com';
  SELECT id INTO v_owner1_id FROM users WHERE email = 'owner1@example.com';
  SELECT id INTO v_owner2_id FROM users WHERE email = 'owner2@example.com';

  -- -------------------------------------------------------
  -- 4. Parking locations
  -- -------------------------------------------------------
  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner1_id, 'Downtown Central Parking', '123 Main St, Downtown', 'New York', 'NY',
     40.7128, -74.0060, 150, 42, 8.00,
     'Prime downtown location with 24/7 security and CCTV.',
     '["CCTV","Security","EV Charging","Restrooms"]', 'approved', '00:00', '23:59')
  RETURNING id INTO v_park1_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner1_id, 'Mall Plaza Parking', '456 Commerce Blvd', 'New York', 'NY',
     40.7589, -73.9851, 300, 87, 5.00,
     'Large parking facility adjacent to the shopping mall.',
     '["CCTV","Handicap Access","Restrooms","Shopping Cart Area"]', 'approved', '07:00', '22:00')
  RETURNING id INTO v_park2_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner1_id, 'Airport Long-Term Parking', '789 Airport Rd, Terminal 2', 'New York', 'NY',
     40.6413, -73.7781, 500, 214, 12.00,
     'Secure long-term airport parking with shuttle service.',
     '["CCTV","Security","Shuttle Service","EV Charging","Car Wash"]', 'approved', '00:00', '23:59')
  RETURNING id INTO v_park3_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner2_id, 'Riverside Business Park', '321 River Ave, Midtown', 'New York', 'NY',
     40.7484, -73.9967, 80, 23, 10.00,
     'Business district parking with monthly and hourly options.',
     '["CCTV","Key Card Access","EV Charging"]', 'approved', '06:00', '22:00')
  RETURNING id INTO v_park4_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner2_id, 'Northside Community Lot', '654 North Blvd', 'New York', 'NY',
     40.7831, -73.9712, 60, 35, 4.00,
     'Affordable community lot. First 30 min free on weekdays.',
     '["CCTV","Lighting"]', 'approved', '05:00', '23:00')
  RETURNING id INTO v_park5_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner2_id, 'Tech Hub Parking Garage', '987 Innovation Dr', 'New York', 'NY',
     40.7282, -73.7949, 200, 0, 7.00,
     'Multi-level parking garage serving the tech district.',
     '["CCTV","EV Charging","Security","Bicycle Racks"]', 'approved', '00:00', '23:59')
  RETURNING id INTO v_park6_id;

  INSERT INTO parking_locations
    (owner_id, name, address, city, state,
     latitude, longitude, total_slots, available_slots,
     hourly_rate, description, amenities, status,
     opening_time, closing_time)
  VALUES
    (v_owner1_id, 'Sunset Strip Parking', '111 Sunset Ave', 'New York', 'NY',
     40.7614, -73.9776, 45, 12, 6.00,
     'Convenient surface lot near restaurants and entertainment.',
     '["CCTV","Lighting"]', 'pending', '08:00', '02:00')
  RETURNING id INTO v_park7_id;

  -- -------------------------------------------------------
  -- 5. Vehicles
  -- -------------------------------------------------------
  INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, make, model, color)
  VALUES
    (v_alice_id, 'NY-ABC-1234', 'car',        'Toyota', 'Camry',    'Silver'),
    (v_alice_id, 'NY-XYZ-5678', 'car',        'Honda',  'Civic',    'Blue'),
    (v_bob_id,   'NY-DEF-9012', 'motorcycle', 'Harley', 'Sportster','Black'),
    (v_carol_id, 'NY-GHI-3456', 'car',        'Ford',   'Explorer', 'White')
  ON CONFLICT (user_id, vehicle_number) DO NOTHING;

  -- -------------------------------------------------------
  -- 6. Reservations
  -- -------------------------------------------------------
  INSERT INTO reservations
    (user_id, parking_id, vehicle_number, vehicle_type,
     start_time, end_time, total_amount, status,
     entry_time, exit_time)
  VALUES
    (v_alice_id, v_park1_id, 'NY-ABC-1234', 'car',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 hours',
     24.00, 'completed',
     NOW() - INTERVAL '5 days' + INTERVAL '5 minutes',
     NOW() - INTERVAL '5 days' + INTERVAL '3 hours'),

    (v_alice_id, v_park2_id, 'NY-ABC-1234', 'car',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
     10.00, 'completed',
     NOW() - INTERVAL '2 days' + INTERVAL '10 minutes',
     NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),

    (v_bob_id, v_park1_id, 'NY-DEF-9012', 'motorcycle',
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '4 hours',
     32.00, 'completed', NULL, NULL),

    (v_carol_id, v_park4_id, 'NY-GHI-3456', 'car',
     NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours',
     20.00, 'confirmed', NULL, NULL),

    (v_alice_id, v_park1_id, 'NY-XYZ-5678', 'car',
     NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours',
     24.00, 'confirmed', NULL, NULL);

END;
$$;
