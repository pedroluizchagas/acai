-- Finance Core Schema (Accounting - Phase 1)

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense','contra')),
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS chart_of_accounts_code_uidx ON chart_of_accounts (code);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  source TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','voided')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  fx_rate NUMERIC(12,6) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "COA viewable" ON chart_of_accounts;
CREATE POLICY "COA viewable" ON chart_of_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "COA insertable" ON chart_of_accounts;
CREATE POLICY "COA insertable" ON chart_of_accounts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "COA updatable" ON chart_of_accounts;
CREATE POLICY "COA updatable" ON chart_of_accounts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Periods viewable" ON accounting_periods;
CREATE POLICY "Periods viewable" ON accounting_periods FOR SELECT USING (true);
DROP POLICY IF EXISTS "Periods insertable" ON accounting_periods;
CREATE POLICY "Periods insertable" ON accounting_periods FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Periods updatable" ON accounting_periods;
CREATE POLICY "Periods updatable" ON accounting_periods FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Journals viewable" ON journals;
CREATE POLICY "Journals viewable" ON journals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Journals insertable" ON journals;
CREATE POLICY "Journals insertable" ON journals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Journals updatable" ON journals;
CREATE POLICY "Journals updatable" ON journals FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Entries viewable" ON journal_entries;
CREATE POLICY "Entries viewable" ON journal_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Entries insertable" ON journal_entries;
CREATE POLICY "Entries insertable" ON journal_entries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Entries updatable" ON journal_entries;
CREATE POLICY "Entries updatable" ON journal_entries FOR UPDATE USING (true);

INSERT INTO chart_of_accounts (code, name, type) VALUES
  ('1.1.1', 'Caixa/Bancos', 'asset'),
  ('2.1.1', 'Fornecedores', 'liability'),
  ('3.1.1', 'Capital Social', 'equity'),
  ('4.1.1', 'Receita de Vendas', 'revenue'),
  ('5.1.1', 'Custo das Vendas', 'expense')
ON CONFLICT (code) DO NOTHING;

