INSERT INTO couriers (id, full_name, phone, active)
VALUES ('fd815b47-0d5b-4245-a258-e4895b804a1b', 'Entregador', NULL, true)
ON CONFLICT (id) DO UPDATE SET active = true;