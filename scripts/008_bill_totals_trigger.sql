CREATE OR REPLACE FUNCTION fn_recalc_bill_total(p_bill_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(total_cost),0) INTO v_total FROM bill_items WHERE bill_id = p_bill_id;
  UPDATE bills SET total = v_total, updated_at = NOW() WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_on_bill_items_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_recalc_bill_total(COALESCE(NEW.bill_id, OLD.bill_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_bill_items_insert ON bill_items;
CREATE TRIGGER trg_on_bill_items_insert
AFTER INSERT ON bill_items
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_items_change();

DROP TRIGGER IF EXISTS trg_on_bill_items_update ON bill_items;
CREATE TRIGGER trg_on_bill_items_update
AFTER UPDATE ON bill_items
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_items_change();

DROP TRIGGER IF EXISTS trg_on_bill_items_delete ON bill_items;
CREATE TRIGGER trg_on_bill_items_delete
AFTER DELETE ON bill_items
FOR EACH ROW
EXECUTE FUNCTION fn_on_bill_items_change();

