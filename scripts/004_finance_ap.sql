-- Accounts Payable (AP) and automation

INSERT INTO chart_of_accounts (code, name, type)
VALUES 
  ('5.1.2', 'Despesas Gerais', 'expense'),
  ('1.1.3', 'Estoques', 'asset')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name TEXT NOT NULL,
  document TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(14,2) NOT NULL,
  category TEXT, -- 'estoque' para insumos; outros para despesas
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ap_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors viewable" ON vendors;
CREATE POLICY "Vendors viewable" ON vendors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Vendors insertable" ON vendors;
CREATE POLICY "Vendors insertable" ON vendors FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Vendors updatable" ON vendors;
CREATE POLICY "Vendors updatable" ON vendors FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Bills viewable" ON bills;
CREATE POLICY "Bills viewable" ON bills FOR SELECT USING (true);
DROP POLICY IF EXISTS "Bills insertable" ON bills;
CREATE POLICY "Bills insertable" ON bills FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Bills updatable" ON bills;
CREATE POLICY "Bills updatable" ON bills FOR UPDATE USING (true);

DROP POLICY IF EXISTS "AP payments viewable" ON ap_payments;
CREATE POLICY "AP payments viewable" ON ap_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "AP payments insertable" ON ap_payments;
CREATE POLICY "AP payments insertable" ON ap_payments FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_on_bill_insert_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_acc_fornec UUID;
  v_acc_expense UUID;
  v_journal_id UUID;
BEGIN
  SELECT id INTO v_acc_fornec FROM chart_of_accounts WHERE code = '2.1.1' LIMIT 1;
  IF COALESCE(NEW.category, '') ILIKE '%estoque%' THEN
    SELECT id INTO v_acc_expense FROM chart_of_accounts WHERE code = '1.1.3' LIMIT 1;
  ELSE
    SELECT id INTO v_acc_expense FROM chart_of_accounts WHERE code = '5.1.2' LIMIT 1;
  END IF;

  IF v_acc_fornec IS NULL OR v_acc_expense IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO journals (date, description, source, reference_id, status)
  VALUES (NOW(), 'Registro de despesa/compra', 'bill_insert', NEW.id, 'posted')
  RETURNING id INTO v_journal_id;

  INSERT INTO journal_entries (journal_id, account_id, debit, credit)
  VALUES 
    (v_journal_id, v_acc_expense, NEW.total, 0),
    (v_journal_id, v_acc_fornec, 0, NEW.total);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_bill_insert_journal ON bills;
CREATE TRIGGER trg_on_bill_insert_journal
AFTER INSERT ON bills
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_insert_journal();

CREATE OR REPLACE FUNCTION fn_on_bill_update_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_id UUID;
  v_acc_cash UUID;
  v_acc_fornec UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    SELECT id INTO v_acc_cash FROM chart_of_accounts WHERE code = '1.1.1' LIMIT 1;
    SELECT id INTO v_acc_fornec FROM chart_of_accounts WHERE code = '2.1.1' LIMIT 1;
    IF v_acc_cash IS NULL OR v_acc_fornec IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO ap_payments (bill_id, amount, method, reference)
    VALUES (NEW.id, NEW.total, 'manual', 'Baixa manual');
    INSERT INTO journals (date, description, source, reference_id, status)
    VALUES (NOW(), 'Pagamento de conta', 'bill_paid', NEW.id, 'posted')
    RETURNING id INTO v_journal_id;
    INSERT INTO journal_entries (journal_id, account_id, debit, credit)
    VALUES 
      (v_journal_id, v_acc_fornec, NEW.total, 0),
      (v_journal_id, v_acc_cash, 0, NEW.total);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_bill_update_paid ON bills;
CREATE TRIGGER trg_on_bill_update_paid
AFTER UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_update_paid();

