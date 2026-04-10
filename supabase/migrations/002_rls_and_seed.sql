-- Enable RLS on all tables
alter table workers enable row level security;
alter table products enable row level security;
alter table shifts enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table audit_logs enable row level security;

-- Workers policies
create policy "Admins can read all workers"
  on workers for select to authenticated using (true);

create policy "Admins can insert workers"
  on workers for insert to authenticated with check (true);

create policy "Admins can update workers"
  on workers for update to authenticated using (true);

-- Products policies
create policy "Anyone can read active products"
  on products for select to anon using (is_active = true);

create policy "Authenticated can read all products"
  on products for select to authenticated using (true);

create policy "Admins can insert products"
  on products for insert to authenticated with check (true);

create policy "Admins can update products"
  on products for update to authenticated using (true);

-- Shifts policies
create policy "Authenticated can read shifts"
  on shifts for select to authenticated using (true);

create policy "Authenticated can insert shifts"
  on shifts for insert to authenticated with check (true);

create policy "Authenticated can update shifts"
  on shifts for update to authenticated using (true);

-- Sales policies
create policy "Authenticated can read sales"
  on sales for select to authenticated using (true);

create policy "Authenticated can insert sales"
  on sales for insert to authenticated with check (true);

create policy "Authenticated can update sales"
  on sales for update to authenticated using (true);

-- Sale items policies
create policy "Authenticated can read sale_items"
  on sale_items for select to authenticated using (true);

create policy "Authenticated can insert sale_items"
  on sale_items for insert to authenticated with check (true);

-- Audit logs policies (read-only for authenticated users)
create policy "Authenticated can read audit_logs"
  on audit_logs for select to authenticated using (true);

-- ============================================================
-- Seed data
-- ============================================================

-- Seed products (core menu items)
insert into products (name, price, category, sort_order) values
  ('Regular Irani Chai', 30, 'beverages', 1),
  ('Special Irani Chai', 50, 'beverages', 2),
  ('Special Coffee', 60, 'beverages', 3),
  ('Mirchi Bajji', 20, 'snacks', 4),
  ('Singara', 25, 'snacks', 5),
  ('Vada', 20, 'snacks', 6);

-- Seed workers with PIN "1234" (hashed via pgcrypto bcrypt)
insert into workers (name, pin_hash) values
  ('Raju', crypt('1234', gen_salt('bf', 10))),
  ('Suresh', crypt('1234', gen_salt('bf', 10))),
  ('Lakshmi', crypt('1234', gen_salt('bf', 10)));
