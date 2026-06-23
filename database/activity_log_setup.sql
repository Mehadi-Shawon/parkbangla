-- ============================================================
-- ParkEasy – Activity Log
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id          SERIAL          PRIMARY KEY,
    actor_id    INTEGER         REFERENCES public.users(id) ON DELETE SET NULL,
    action      VARCHAR(100)    NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    meta        JSONB           DEFAULT '{}',
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor   ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON public.activity_logs(action);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see everything
CREATE POLICY "activity_admin_select" ON public.activity_logs
  FOR SELECT USING (get_my_role() = 'admin');

-- Owners see activity on their parking locations + their own actions
CREATE POLICY "activity_owner_select" ON public.activity_logs
  FOR SELECT USING (
    actor_id = get_my_user_id()
    OR (entity_type = 'parking' AND entity_id IN (
      SELECT id FROM public.parking_locations WHERE owner_id = get_my_user_id()
    ))
  );

-- Any authenticated user can insert their own activity
CREATE POLICY "activity_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (actor_id = get_my_user_id());
