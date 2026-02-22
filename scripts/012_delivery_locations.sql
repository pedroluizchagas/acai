CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  lat NUMERIC(10,6) NOT NULL,
  lng NUMERIC(10,6) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delivery locations viewable by courier" ON delivery_locations;
CREATE POLICY "Delivery locations viewable by courier" ON delivery_locations
FOR SELECT USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND o.courier_id = auth.uid())
  OR EXISTS(SELECT 1 FROM admin_users au WHERE au.id = auth.uid()));

DROP POLICY IF EXISTS "Delivery locations insertable by courier" ON delivery_locations;
CREATE POLICY "Delivery locations insertable by courier" ON delivery_locations
FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM orders o WHERE o.id = order_id AND o.courier_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_delivery_locations_order ON delivery_locations(order_id, recorded_at);

