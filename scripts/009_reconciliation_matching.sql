CREATE OR REPLACE FUNCTION fn_reconcile_statements_auto(tolerance_days INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH cte AS (
    SELECT
      s.id AS stmt_id,
      s.date AS stmt_date,
      s.amount AS stmt_amount
    FROM bank_statements s
    WHERE s.status = 'pending'
  ),
  cash_account AS (
    SELECT id FROM chart_of_accounts WHERE code = '1.1.1' LIMIT 1
  ),
  candidates AS (
    SELECT
      c.stmt_id,
      je.id AS entry_id,
      j.date AS entry_date,
      (je.debit - je.credit) AS entry_amount
    FROM cte c
    CROSS JOIN cash_account
    JOIN journal_entries je ON je.account_id = cash_account.id
    JOIN journals j ON j.id = je.journal_id
    LEFT JOIN reconciliations r ON r.journal_entry_id = je.id
    WHERE r.id IS NULL
      AND ABS((je.debit - je.credit) - c.stmt_amount) < 0.005
      AND j.date::date BETWEEN (c.stmt_date - tolerance_days) AND (c.stmt_date + tolerance_days)
  ),
  ranked AS (
    SELECT
      stmt_id,
      entry_id,
      ROW_NUMBER() OVER (PARTITION BY stmt_id ORDER BY ABS(entry_amount)) AS rn
    FROM candidates
  ),
  chosen AS (
    SELECT stmt_id, entry_id FROM ranked WHERE rn = 1
  )
  INSERT INTO reconciliations (bank_statement_id, journal_entry_id)
  SELECT stmt_id, entry_id FROM chosen
  ON CONFLICT DO NOTHING;

  UPDATE bank_statements s
  SET status = 'reconciled', updated_at = NOW()
  FROM reconciliations r
  WHERE r.bank_statement_id = s.id
    AND s.status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

