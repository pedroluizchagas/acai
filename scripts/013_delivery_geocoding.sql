-- Geocoding and routing support for deliveries
-- Adds customer coordinates and route metrics

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS customer_lng NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS eta_min NUMERIC(10,2);

ALTER TABLE checkout_intents 
  ADD COLUMN IF NOT EXISTS customer_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS customer_lng NUMERIC(10,6);

