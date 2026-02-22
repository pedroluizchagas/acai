CREATE TABLE IF NOT EXISTS recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
  qty NUMERIC(12,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
  qty NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(14,4) NOT NULL,
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(qty * unit_cost, 2)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe view" ON recipe_items;
CREATE POLICY "recipe view" ON recipe_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "recipe write" ON recipe_items;
CREATE POLICY "recipe write" ON recipe_items FOR INSERT WITH CHECK (true);
CREATE POLICY "recipe update" ON recipe_items FOR UPDATE USING (true);
CREATE POLICY "recipe delete" ON recipe_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "bill_items view" ON bill_items;
CREATE POLICY "bill_items view" ON bill_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "bill_items write" ON bill_items;
CREATE POLICY "bill_items write" ON bill_items FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_get_avg_cost(p_stock_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_qty NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_cost),0), COALESCE(SUM(qty),0)
  INTO v_total, v_qty
  FROM stock_movements
  WHERE stock_item_id = p_stock_id AND type = 'in';
  IF v_qty IS NULL OR v_qty = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(v_total / v_qty, 4);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_on_bill_items_insert_movement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_movements (stock_item_id, type, qty, unit_cost, total_cost, ref_type, ref_id)
  VALUES (NEW.stock_item_id, 'in', NEW.qty, NEW.unit_cost, NEW.total_cost, 'bill', NEW.bill_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_bill_items_insert_movement ON bill_items;
CREATE TRIGGER trg_on_bill_items_insert_movement
AFTER INSERT ON bill_items
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_items_insert_movement();

CREATE OR REPLACE FUNCTION fn_on_order_update_completed_cogs()
RETURNS TRIGGER AS $$
DECLARE
  v_exists UUID;
  v_journal_id UUID;
  v_acc_cogs UUID;
  v_acc_stock UUID;
  v_rate NUMERIC;
  v_cogs NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT id INTO v_exists FROM journals WHERE source = 'order_cogs' AND reference_id = NEW.id LIMIT 1;
    IF v_exists IS NOT NULL THEN
      RETURN NEW;
    END IF;
    SELECT id INTO v_acc_cogs FROM chart_of_accounts WHERE code = '5.1.1' LIMIT 1;
    SELECT id INTO v_acc_stock FROM chart_of_accounts WHERE code = '1.1.3' LIMIT 1;
    IF v_acc_cogs IS NULL OR v_acc_stock IS NULL THEN
      RETURN NEW;
    END IF;
    WITH names AS (
      SELECT DISTINCT TRIM(both FROM n) AS name
      FROM (
        SELECT (jsonb_array_elements(NEW.items)->>'name') AS n
        UNION ALL
        SELECT (jsonb_array_elements(NEW.items)->>'base') AS n
        UNION ALL
        SELECT jsonb_array_elements_text(jsonb_array_elements(NEW.items)->'addons') AS n
      ) s
      WHERE n IS NOT NULL AND n <> ''
    ),
    prod AS (
      SELECT p.id FROM products p JOIN names n ON p.name = n.name
    ),
    req AS (
      SELECT r.stock_item_id, SUM(r.qty) AS qty
      FROM recipe_items r
      JOIN prod p ON p.id = r.product_id
      GROUP BY r.stock_item_id
    ),
    calc AS (
      SELECT
        req.stock_item_id,
        req.qty AS total_qty,
        fn_get_avg_cost(req.stock_item_id) AS unit_cost
      FROM req
    ),
    used AS (
      SELECT stock_item_id, total_qty, COALESCE(unit_cost,0) AS unit_cost, ROUND(total_qty * COALESCE(unit_cost,0), 2) AS cost
      FROM calc
    )
    SELECT COALESCE(SUM(cost),0) INTO v_cogs FROM used;
    IF v_cogs IS NULL OR v_cogs = 0 THEN
      SELECT default_rate INTO v_rate FROM cogs_config LIMIT 1;
      IF v_rate IS NULL THEN v_rate := 0.35; END IF;
      v_cogs := ROUND((COALESCE(NEW.subtotal,0) - COALESCE(NEW.discount_total,0)) * v_rate, 2);
    ELSE
      INSERT INTO stock_movements (stock_item_id, type, qty, unit_cost, total_cost, ref_type, ref_id)
      SELECT stock_item_id, 'out', total_qty, unit_cost, ROUND(total_qty * unit_cost, 2), 'order', NEW.id
      FROM used
      WHERE total_qty > 0 AND unit_cost > 0;
    END IF;
    IF v_cogs > 0 THEN
      INSERT INTO journals (date, description, source, reference_id, status)
      VALUES (NOW(), CONCAT('COGS Pedido #', COALESCE(NEW.order_number::text, '')), 'order_cogs', NEW.id, 'posted')
      RETURNING id INTO v_journal_id;
      INSERT INTO journal_entries (journal_id, account_id, debit, credit)
      VALUES 
        (v_journal_id, v_acc_cogs, v_cogs, 0),
        (v_journal_id, v_acc_stock, 0, v_cogs);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_order_update_completed_cogs ON orders;
CREATE TRIGGER trg_on_order_update_completed_cogs
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_on_order_update_completed_cogs();

