CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push viewable by user" ON push_subscriptions;
CREATE POLICY "Push viewable by user" ON push_subscriptions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Push insertable by user" ON push_subscriptions;
CREATE POLICY "Push insertable by user" ON push_subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Push updatable by user" ON push_subscriptions;
CREATE POLICY "Push updatable by user" ON push_subscriptions
FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

