-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Workers table
create table workers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products table
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price decimal(10,2) not null check (price >= 0),
  category text not null default 'general',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shifts table
create table shifts (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references workers(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

-- Sales table (worker_name is snapshot field)
create table sales (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid not null references shifts(id),
  worker_id uuid not null references workers(id),
  worker_name text not null,
  payment_mode text not null check (payment_mode in ('cash', 'online')),
  total_amount decimal(10,2) not null check (total_amount >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  voided_at timestamptz,
  voided_by uuid references workers(id),
  void_reason text,
  created_at timestamptz not null default now()
);

-- Sale items table (product_name, unit_price are snapshot fields)
create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  unit_price decimal(10,2) not null,
  quantity integer not null default 1 check (quantity > 0),
  subtotal decimal(10,2) not null,
  created_at timestamptz not null default now()
);

-- Audit logs table
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  performed_at timestamptz not null default now()
);

-- Indexes
create index idx_shifts_worker_id on shifts(worker_id);
create index idx_shifts_status on shifts(status);
create index idx_sales_shift_id on sales(shift_id);
create index idx_sales_worker_id on sales(worker_id);
create index idx_sales_created_at on sales(created_at desc);
create index idx_sales_status on sales(status);
create index idx_sale_items_sale_id on sale_items(sale_id);
create index idx_audit_logs_table_record on audit_logs(table_name, record_id);
create index idx_audit_logs_performed_at on audit_logs(performed_at desc);

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workers_updated_at
  before update on workers
  for each row execute function update_updated_at();

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- Audit log trigger
create or replace function audit_log_trigger()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into audit_logs (table_name, record_id, action, new_data)
    values (tg_table_name, new.id, 'INSERT', to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into audit_logs (table_name, record_id, action, old_data, new_data)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into audit_logs (table_name, record_id, action, old_data)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger audit_workers
  after insert or update or delete on workers
  for each row execute function audit_log_trigger();

create trigger audit_products
  after insert or update or delete on products
  for each row execute function audit_log_trigger();

create trigger audit_shifts
  after insert or update or delete on shifts
  for each row execute function audit_log_trigger();

create trigger audit_sales
  after insert or update or delete on sales
  for each row execute function audit_log_trigger();

create trigger audit_sale_items
  after insert or update or delete on sale_items
  for each row execute function audit_log_trigger();
