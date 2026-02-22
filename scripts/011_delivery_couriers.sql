CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Couriers viewable" ON couriers;
CREATE POLICY "Couriers viewable" ON couriers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Couriers insertable" ON couriers;
CREATE POLICY "Couriers insertable" ON couriers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Couriers updatable" ON couriers;
CREATE POLICY "Couriers updatable" ON couriers FOR UPDATE USING (true);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_last_lat NUMERIC(10,6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_last_lng NUMERIC(10,6);

CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);

UPDATE orders
SET delivery_status = COALESCE(delivery_status, 'assigned')
WHERE status = 'out_for_delivery' AND delivery_status IS NULL;
