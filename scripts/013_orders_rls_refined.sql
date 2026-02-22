DROP POLICY IF EXISTS "Orders updatable" ON orders;

CREATE POLICY "Orders updatable by courier"
ON orders FOR UPDATE
USING (auth.uid() = courier_id);

CREATE POLICY "Orders updatable by admin"
ON orders FOR UPDATE
USING (EXISTS(SELECT 1 FROM admin_users au WHERE au.id = auth.uid()));

