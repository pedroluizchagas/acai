-- Courier fee rules for earnings calculation

CREATE TABLE IF NOT EXISTS courier_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT true,
  flat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_km_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  percent_order NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE courier_fee_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fee rules viewable" ON courier_fee_rules;
CREATE POLICY "Fee rules viewable" ON courier_fee_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Fee rules modifiable by admin" ON courier_fee_rules;
CREATE POLICY "Fee rules modifiable by admin" ON courier_fee_rules 
FOR ALL USING (EXISTS(SELECT 1 FROM admin_users au WHERE au.id = auth.uid()))
WITH CHECK (EXISTS(SELECT 1 FROM admin_users au WHERE au.id = auth.uid()));

INSERT INTO courier_fee_rules (active, flat_amount, per_km_amount, percent_order)
SELECT true, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM courier_fee_rules);

