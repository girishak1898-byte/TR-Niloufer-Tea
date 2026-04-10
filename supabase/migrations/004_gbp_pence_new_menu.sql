-- Migration 004: GBP pence pricing, new menu, voided_by fix

-- 1. Fix voided_by column (allow text for admin email or worker ID)
alter table sales drop constraint if exists sales_voided_by_fkey;
alter table sales alter column voided_by type text using voided_by::text;

-- 2. Replace products with GBP pence pricing
delete from products;
alter table products drop column price;
alter table products add column price_pence integer not null default 0 check (price_pence >= 0);

-- 3. Insert new menu
insert into products (name, price_pence, category, sort_order) values
  ('Small Chai', 70, 'drinks', 1),
  ('Regular Chai', 100, 'drinks', 2),
  ('Special Irani Chai', 120, 'drinks', 3),
  ('Special Coffee', 100, 'drinks', 4),
  ('Herbal Tea', 200, 'drinks', 5),
  ('Lemon Tea', 180, 'drinks', 6),
  ('Samosa', 100, 'snacks', 7),
  ('Mirchi Bajji', 100, 'snacks', 8),
  ('Vada', 100, 'snacks', 9);
