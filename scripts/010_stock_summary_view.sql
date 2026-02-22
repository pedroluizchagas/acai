CREATE OR REPLACE VIEW view_stock_summary AS
WITH mv AS (
  SELECT
    stock_item_id,
    SUM(CASE WHEN type = 'in' THEN qty ELSE 0 END) AS qty_in,
    SUM(CASE WHEN type = 'out' THEN qty ELSE 0 END) AS qty_out,
    SUM(CASE WHEN type = 'in' THEN total_cost ELSE 0 END) AS total_in_cost,
    SUM(CASE WHEN type = 'in' THEN qty ELSE 0 END) AS total_in_qty
  FROM stock_movements
  GROUP BY stock_item_id
)
SELECT
  s.id,
  s.item_name,
  s.unit,
  s.min_quantity,
  COALESCE(mv.qty_in, 0) AS qty_in,
  COALESCE(mv.qty_out, 0) AS qty_out,
  COALESCE(mv.qty_in, 0) - COALESCE(mv.qty_out, 0) AS qty_on_hand,
  CASE WHEN COALESCE(mv.total_in_qty,0) > 0 THEN ROUND(mv.total_in_cost / mv.total_in_qty, 4) ELSE 0 END AS avg_cost,
  ROUND((COALESCE(mv.qty_in, 0) - COALESCE(mv.qty_out, 0)) * CASE WHEN COALESCE(mv.total_in_qty,0) > 0 THEN mv.total_in_cost / mv.total_in_qty ELSE 0 END, 2) AS total_value
FROM stock s
LEFT JOIN mv ON mv.stock_item_id = s.id;

