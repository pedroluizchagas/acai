-- Sessions table to track courier online/offline periods

CREATE TABLE IF NOT EXISTS courier_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE courier_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Courier sessions viewable by self or admin" ON courier_sessions;
CREATE POLICY "Courier sessions viewable by self or admin" ON courier_sessions
FOR SELECT USING (courier_id = auth.uid() OR EXISTS(SELECT 1 FROM admin_users au WHERE au.id = auth.uid()));

DROP POLICY IF EXISTS "Courier sessions insertable by self" ON courier_sessions;
CREATE POLICY "Courier sessions insertable by self" ON courier_sessions
FOR INSERT WITH CHECK (courier_id = auth.uid());

DROP POLICY IF EXISTS "Courier sessions updatable by self" ON courier_sessions;
CREATE POLICY "Courier sessions updatable by self" ON courier_sessions
FOR UPDATE USING (courier_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_courier_sessions_courier_day ON courier_sessions(courier_id, day);

