-- ============================================================
-- ParkEasy – Platform Settings Table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('commission_rate',     '"10"'),
  ('max_booking_hours',   '"72"'),
  ('min_booking_hours',   '"1"'),
  ('maintenance_mode',    'false'),
  ('platform_name',       '"ParkEasy"'),
  ('support_email',       '"support@parkeasy.com"'),
  ('currency',            '"USD"')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write settings
CREATE POLICY "settings_admin_select" ON public.platform_settings
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "settings_admin_update" ON public.platform_settings
  FOR UPDATE USING (get_my_role() = 'admin');
