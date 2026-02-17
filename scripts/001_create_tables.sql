-- Açaí Delivery SaaS Database Schema

-- Products table (açaí sizes, bases, and add-ons)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock/Inventory table
CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'unidade',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_complement TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 5.00,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table (for dashboard access)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing settings (tracking and reviews)
CREATE TABLE IF NOT EXISTS marketing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  meta_pixel_id TEXT,
  ga4_id TEXT,
  google_review_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_settings ENABLE ROW LEVEL SECURITY;

-- Products are public read
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- Stock is public for this demo
DROP POLICY IF EXISTS "Stock viewable by everyone" ON stock;
CREATE POLICY "Stock viewable by everyone" ON stock FOR SELECT USING (true);
DROP POLICY IF EXISTS "Stock insertable" ON stock;
CREATE POLICY "Stock insertable" ON stock FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Stock updatable" ON stock;
CREATE POLICY "Stock updatable" ON stock FOR UPDATE USING (true);

-- Orders policies
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Orders viewable by everyone" ON orders;
CREATE POLICY "Orders viewable by everyone" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Orders updatable" ON orders;
CREATE POLICY "Orders updatable" ON orders FOR UPDATE USING (true);

-- Admin users
DROP POLICY IF EXISTS "Admin users viewable" ON admin_users;
CREATE POLICY "Admin users viewable" ON admin_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin users insertable" ON admin_users;
CREATE POLICY "Admin users insertable" ON admin_users FOR INSERT WITH CHECK (true);

-- Marketing settings policies
DROP POLICY IF EXISTS "Marketing settings viewable" ON marketing_settings;
CREATE POLICY "Marketing settings viewable" ON marketing_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Marketing settings insertable" ON marketing_settings;
CREATE POLICY "Marketing settings insertable" ON marketing_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Marketing settings updatable" ON marketing_settings;
CREATE POLICY "Marketing settings updatable" ON marketing_settings FOR UPDATE USING (true);

-- Insert default products (sizes)
INSERT INTO products (name, description, price, category) VALUES
  ('Pequeno 300ml', 'Copo de açaí 300ml - perfeito para uma pessoa', 15.00, 'size'),
  ('Médio 500ml', 'Copo de açaí 500ml - ideal para compartilhar', 22.00, 'size'),
  ('Grande 700ml', 'Copo de açaí 700ml - para os amantes de açaí', 28.00, 'size');

-- Insert default products (bases)
INSERT INTO products (name, description, price, category) VALUES
  ('Açaí Puro', 'Açaí tradicional cremoso sem adições', 0.00, 'base'),
  ('Açaí com Banana', 'Açaí batido com banana fresca', 2.00, 'base'),
  ('Açaí com Morango', 'Açaí batido com morango natural', 3.00, 'base');

-- Insert default products (addons)
INSERT INTO products (name, description, price, category) VALUES
  ('Granola', 'Granola crocante tradicional', 3.00, 'addon'),
  ('Leite em Pó', 'Leite em pó Ninho', 2.50, 'addon'),
  ('Paçoca', 'Paçoca triturada', 3.00, 'addon'),
  ('Leite Condensado', 'Leite condensado cremoso', 3.50, 'addon'),
  ('Nutella', 'Creme de avelã Nutella', 5.00, 'addon'),
  ('Banana Fatiada', 'Banana fresca fatiada por cima', 2.00, 'addon'),
  ('Morango Fatiado', 'Morangos frescos fatiados', 4.00, 'addon'),
  ('Mel', 'Mel puro de abelha', 2.00, 'addon');

-- Insert default stock items
INSERT INTO stock (item_name, quantity, min_quantity, unit) VALUES
  ('Polpa de Açaí (kg)', 50, 10, 'kg'),
  ('Banana', 100, 20, 'unidade'),
  ('Morango', 80, 15, 'unidade'),
  ('Granola', 30, 5, 'pacote'),
  ('Leite em Pó', 25, 5, 'lata'),
  ('Paçoca', 40, 10, 'pacote'),
  ('Leite Condensado', 35, 8, 'lata'),
  ('Nutella', 15, 3, 'pote'),
  ('Mel', 20, 5, 'frasco'),
  ('Copos 300ml', 200, 50, 'unidade'),
  ('Copos 500ml', 150, 40, 'unidade'),
  ('Copos 700ml', 100, 30, 'unidade'),
  ('Colheres', 300, 100, 'unidade');

-- Insert sample orders for testing
INSERT INTO orders (customer_name, customer_phone, customer_address, items, subtotal, delivery_fee, total, payment_method, status, created_at) VALUES
  ('Maria Silva', '(11) 99999-1234', 'Rua das Flores, 123 - Centro', '[{"size": "Médio 500ml", "base": "Açaí com Banana", "addons": ["Granola", "Leite Condensado"], "price": 27.50}]', 27.50, 5.00, 32.50, 'pix', 'pending', NOW() - INTERVAL '5 minutes'),
  ('João Santos', '(11) 98888-5678', 'Av. Brasil, 456 - Jardim América', '[{"size": "Grande 700ml", "base": "Açaí Puro", "addons": ["Granola", "Paçoca", "Mel"], "price": 36.00}]', 36.00, 5.00, 41.00, 'card', 'preparing', NOW() - INTERVAL '15 minutes'),
  ('Ana Costa', '(11) 97777-9012', 'Rua do Comércio, 789 - Vila Nova', '[{"size": "Pequeno 300ml", "base": "Açaí com Morango", "addons": ["Leite em Pó"], "price": 20.50}]', 20.50, 5.00, 25.50, 'cash', 'delivering', NOW() - INTERVAL '25 minutes'),
  ('Pedro Oliveira', '(11) 96666-3456', 'Av. Paulista, 1000 - Bela Vista', '[{"size": "Médio 500ml", "base": "Açaí com Banana", "addons": ["Nutella", "Banana Fatiada"], "price": 29.00}]', 29.00, 5.00, 34.00, 'pix', 'completed', NOW() - INTERVAL '45 minutes'),
  ('Carla Mendes', '(11) 95555-7890', 'Rua Augusta, 500 - Consolação', '[{"size": "Grande 700ml", "base": "Açaí com Morango", "addons": ["Granola", "Morango Fatiado", "Leite Condensado"], "price": 38.50}]', 38.50, 5.00, 43.50, 'card', 'completed', NOW() - INTERVAL '1 hour'),
  ('Lucas Ferreira', '(11) 94444-1234', 'Rua Oscar Freire, 200', '[{"size": "Pequeno 300ml", "base": "Açaí Puro", "addons": ["Granola"], "price": 18.00}]', 18.00, 5.00, 23.00, 'pix', 'completed', NOW() - INTERVAL '2 hours'),
  ('Fernanda Lima', '(11) 93333-5678', 'Av. Rebouças, 800', '[{"size": "Médio 500ml", "base": "Açaí com Banana", "addons": ["Paçoca", "Mel"], "price": 27.00}]', 27.00, 5.00, 32.00, 'card', 'completed', NOW() - INTERVAL '3 hours');

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('fixed','percent','free_shipping')),
  value DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  max_redemptions INTEGER,
  redemptions_count INTEGER DEFAULT 0,
  first_time_only BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons viewable by everyone" ON coupons;
CREATE POLICY "Coupons viewable by everyone" ON coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Coupons insertable" ON coupons;
CREATE POLICY "Coupons insertable" ON coupons FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Coupons updatable" ON coupons;
CREATE POLICY "Coupons updatable" ON coupons FOR UPDATE USING (true);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS first_order_banner_enabled BOOLEAN DEFAULT false;
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS first_order_banner_text TEXT;
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS first_order_coupon_code TEXT;
 
-- Checkout intents (para recuperação de carrinho abandonado)
CREATE TABLE IF NOT EXISTS checkout_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB,
  subtotal DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2),
  discount_total DECIMAL(10, 2),
  total DECIMAL(10, 2),
  coupon_code TEXT,
  status TEXT DEFAULT 'pending', -- pending | converted | dismissed
  converted_at TIMESTAMPTZ,
  order_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE checkout_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Checkout intents viewable" ON checkout_intents;
CREATE POLICY "Checkout intents viewable" ON checkout_intents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Checkout intents insertable" ON checkout_intents;
CREATE POLICY "Checkout intents insertable" ON checkout_intents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Checkout intents updatable" ON checkout_intents;
CREATE POLICY "Checkout intents updatable" ON checkout_intents FOR UPDATE USING (true);

-- Campos para integração opcional com provedores de WhatsApp
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS whatsapp_provider_url TEXT;
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS whatsapp_provider_token TEXT;
ALTER TABLE marketing_settings ADD COLUMN IF NOT EXISTS whatsapp_sender TEXT;
