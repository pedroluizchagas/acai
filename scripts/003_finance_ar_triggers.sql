-- Accounts Receivable (AR) and automation from Orders

-- Ensure 'Clientes' account exists
INSERT INTO chart_of_accounts (code, name, type)
VALUES ('1.1.2', 'Clientes', 'asset')
ON CONFLICT (code) DO NOTHING;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  order_id UUID UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipts
CREATE TABLE IF NOT EXISTS ar_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoices viewable" ON invoices;
CREATE POLICY "Invoices viewable" ON invoices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Invoices insertable" ON invoices;
CREATE POLICY "Invoices insertable" ON invoices FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Invoices updatable" ON invoices;
CREATE POLICY "Invoices updatable" ON invoices FOR UPDATE USING (true);

DROP POLICY IF EXISTS "AR receipts viewable" ON ar_receipts;
CREATE POLICY "AR receipts viewable" ON ar_receipts FOR SELECT USING (true);
DROP POLICY IF EXISTS "AR receipts insertable" ON ar_receipts;
CREATE POLICY "AR receipts insertable" ON ar_receipts FOR INSERT WITH CHECK (true);

-- Helper to get account id by code
CREATE OR REPLACE FUNCTION get_account_id_by_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM chart_of_accounts WHERE code = p_code AND active LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create invoice and revenue journal on order insert
CREATE OR REPLACE FUNCTION fn_on_order_insert_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_acc_receita UUID := get_account_id_by_code('4.1.1');
  v_acc_clientes UUID := get_account_id_by_code('1.1.2');
BEGIN
  IF v_acc_receita IS NULL OR v_acc_clientes IS NULL THEN
    RETURN NEW; -- Skip if accounts not ready
  END IF;

  -- Create invoice if not exists
  INSERT INTO invoices (order_id, customer_name, customer_phone, issue_date, due_date, amount, status)
  VALUES (NEW.id, NEW.customer_name, NEW.customer_phone, CURRENT_DATE, CURRENT_DATE, NEW.total, 'open')
  ON CONFLICT (order_id) DO UPDATE
    SET amount = EXCLUDED.amount,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        updated_at = NOW()
  RETURNING id INTO v_invoice_id;

  -- Create revenue journal (competência): D Clientes / C Receita
  INSERT INTO journals (date, description, source, reference_id, status)
  VALUES (NOW(), CONCAT('Pedido #', COALESCE(NEW.order_number::text, '')), 'order_insert', NEW.id, 'posted')
  RETURNING id INTO v_invoice_id; -- reuse variable to hold journal id

  INSERT INTO journal_entries (journal_id, account_id, debit, credit)
  VALUES 
    (v_invoice_id, v_acc_clientes, NEW.total, 0),
    (v_invoice_id, v_acc_receita, 0, NEW.total);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_order_insert_create_invoice ON orders;
CREATE TRIGGER trg_on_order_insert_create_invoice
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_on_order_insert_create_invoice();

-- Create receipt and cash journal when order becomes completed
CREATE OR REPLACE FUNCTION fn_on_order_update_completed_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_journal_id UUID;
  v_acc_cash UUID := get_account_id_by_code('1.1.1');
  v_acc_clientes UUID := get_account_id_by_code('1.1.2');
BEGIN
  IF v_acc_cash IS NULL OR v_acc_clientes IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT * INTO v_invoice FROM invoices WHERE order_id = NEW.id LIMIT 1;
    IF v_invoice.id IS NOT NULL AND v_invoice.status <> 'paid' THEN
      -- Mark invoice as paid
      UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = v_invoice.id;
      -- Create receipt
      INSERT INTO ar_receipts (invoice_id, amount, method, paid_at, reference)
      VALUES (v_invoice.id, NEW.total, NEW.payment_method, NOW(), CONCAT('Pedido #', COALESCE(NEW.order_number::text, '')));
      -- Cash journal: D Caixa / C Clientes
      INSERT INTO journals (date, description, source, reference_id, status)
      VALUES (NOW(), CONCAT('Baixa Pedido #', COALESCE(NEW.order_number::text, '')), 'order_completed', NEW.id, 'posted')
      RETURNING id INTO v_journal_id;
      INSERT INTO journal_entries (journal_id, account_id, debit, credit)
      VALUES 
        (v_journal_id, v_acc_cash, NEW.total, 0),
        (v_journal_id, v_acc_clientes, 0, NEW.total);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_order_update_completed_receipt ON orders;
CREATE TRIGGER trg_on_order_update_completed_receipt
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_on_order_update_completed_receipt();

