CREATE TABLE IF NOT EXISTS cogs_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  default_rate NUMERIC(6,4) NOT NULL DEFAULT 0.35,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID,
  type TEXT NOT NULL CHECK (type IN ('in','out','adjust')),
  qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ref_type TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cogs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cogs config view" ON cogs_config;
CREATE POLICY "cogs config view" ON cogs_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "cogs config write" ON cogs_config;
CREATE POLICY "cogs config write" ON cogs_config FOR INSERT WITH CHECK (true);
CREATE POLICY "cogs config update" ON cogs_config FOR UPDATE USING (true);

DROP POLICY IF EXISTS "stock movements view" ON stock_movements;
CREATE POLICY "stock movements view" ON stock_movements FOR SELECT USING (true);
DROP POLICY IF EXISTS "stock movements write" ON stock_movements;
CREATE POLICY "stock movements write" ON stock_movements FOR INSERT WITH CHECK (true);

INSERT INTO cogs_config (default_rate)
SELECT 0.35
WHERE NOT EXISTS (SELECT 1 FROM cogs_config);

CREATE OR REPLACE VIEW view_dre_monthly AS
WITH base AS (
  SELECT
    date_trunc('month', j.date)::date AS month,
    a.type,
    a.name,
    SUM(je.debit) AS debit,
    SUM(je.credit) AS credit
  FROM journal_entries je
  JOIN journals j ON j.id = je.journal_id
  JOIN chart_of_accounts a ON a.id = je.account_id
  GROUP BY 1,2,3
),
agg AS (
  SELECT
    month,
    SUM(CASE WHEN type = 'revenue' THEN credit - debit ELSE 0 END) AS revenue,
    SUM(CASE WHEN type = 'expense' AND name ILIKE '%Custo das Vendas%' THEN debit - credit ELSE 0 END) AS cogs,
    SUM(CASE WHEN type = 'expense' AND name NOT ILIKE '%Custo das Vendas%' THEN debit - credit ELSE 0 END) AS other_expenses
  FROM base
  GROUP BY 1
)
SELECT
  month,
  COALESCE(revenue,0) AS revenue,
  COALESCE(cogs,0) AS cogs,
  COALESCE(revenue,0) - COALESCE(cogs,0) AS gross_margin,
  COALESCE(other_expenses,0) AS other_expenses,
  COALESCE(revenue,0) - COALESCE(cogs,0) - COALESCE(other_expenses,0) AS net_result
FROM agg;

CREATE OR REPLACE VIEW view_cashflow_monthly_direct AS
SELECT
  date_trunc('month', j.date)::date AS month,
  SUM(CASE WHEN a.code = '1.1.1' THEN je.debit - je.credit ELSE 0 END) AS net_cash
FROM journal_entries je
JOIN journals j ON j.id = je.journal_id
JOIN chart_of_accounts a ON a.id = je.account_id
GROUP BY 1;

CREATE OR REPLACE FUNCTION fn_on_order_update_completed_cogs()
RETURNS TRIGGER AS $$
DECLARE
  v_cfg_rate NUMERIC(6,4);
  v_cogs NUMERIC(14,2);
  v_journal_id UUID;
  v_acc_cogs UUID;
  v_acc_stock UUID;
  v_exists UUID;
  v_base NUMERIC(14,2);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT default_rate INTO v_cfg_rate FROM cogs_config LIMIT 1;
    IF v_cfg_rate IS NULL THEN
      v_cfg_rate := 0.35;
    END IF;
    v_base := COALESCE(NEW.subtotal,0) - COALESCE(NEW.discount_total,0);
    v_cogs := ROUND(v_base * v_cfg_rate, 2);
    IF v_cogs <= 0 THEN
      RETURN NEW;
    END IF;
    SELECT id INTO v_exists FROM journals WHERE source = 'order_cogs' AND reference_id = NEW.id LIMIT 1;
    IF v_exists IS NOT NULL THEN
      RETURN NEW;
    END IF;
    SELECT id INTO v_acc_cogs FROM chart_of_accounts WHERE code = '5.1.1' LIMIT 1;
    SELECT id INTO v_acc_stock FROM chart_of_accounts WHERE code = '1.1.3' LIMIT 1;
    IF v_acc_cogs IS NULL OR v_acc_stock IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO journals (date, description, source, reference_id, status)
    VALUES (NOW(), CONCAT('COGS Pedido #', COALESCE(NEW.order_number::text, '')), 'order_cogs', NEW.id, 'posted')
    RETURNING id INTO v_journal_id;
    INSERT INTO journal_entries (journal_id, account_id, debit, credit)
    VALUES 
      (v_journal_id, v_acc_cogs, v_cogs, 0),
      (v_journal_id, v_acc_stock, 0, v_cogs);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_order_update_completed_cogs ON orders;
CREATE TRIGGER trg_on_order_update_completed_cogs
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_on_order_update_completed_cogs();

