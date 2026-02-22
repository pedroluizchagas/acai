-- Treasury: bank accounts, statements, simple reconciliation

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('bank','cash')),
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reconciled','ignored')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bank accounts viewable" ON bank_accounts;
CREATE POLICY "Bank accounts viewable" ON bank_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Bank accounts insertable" ON bank_accounts;
CREATE POLICY "Bank accounts insertable" ON bank_accounts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Bank accounts updatable" ON bank_accounts;
CREATE POLICY "Bank accounts updatable" ON bank_accounts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Statements viewable" ON bank_statements;
CREATE POLICY "Statements viewable" ON bank_statements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Statements insertable" ON bank_statements;
CREATE POLICY "Statements insertable" ON bank_statements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Statements updatable" ON bank_statements;
CREATE POLICY "Statements updatable" ON bank_statements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Reconciliations viewable" ON reconciliations;
CREATE POLICY "Reconciliations viewable" ON reconciliations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Reconciliations insertable" ON reconciliations;
CREATE POLICY "Reconciliations insertable" ON reconciliations FOR INSERT WITH CHECK (true);

