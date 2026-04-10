-- Migration 005: Inventory management and proof uploads

-- 1. Inventory Items table
create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  unit text not null default 'units',
  current_stock numeric(10,2) not null default 0,
  low_stock_threshold numeric(10,2) not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Inventory Movements table
create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  inventory_item_id uuid not null references inventory_items(id),
  movement_type text not null check (movement_type in ('purchase', 'usage', 'adjustment', 'waste')),
  quantity numeric(10,2) not null,
  note text,
  proof_upload_id uuid,
  performed_by text,
  created_at timestamptz not null default now()
);

-- 3. Proof Uploads table
create table proof_uploads (
  id uuid primary key default uuid_generate_v4(),
  storage_path text not null,
  original_filename text not null,
  file_size_bytes integer not null,
  mime_type text not null,
  submitted_name text,
  item_name text,
  supplier_name text,
  uploader_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  linked_movement_id uuid references inventory_movements(id),
  created_at timestamptz not null default now()
);

-- Add FK from movements to proof_uploads
alter table inventory_movements
  add constraint fk_movements_proof
  foreign key (proof_upload_id) references proof_uploads(id);

-- Indexes
create index idx_inventory_items_active on inventory_items(is_active);
create index idx_inventory_movements_item on inventory_movements(inventory_item_id);
create index idx_inventory_movements_created on inventory_movements(created_at desc);
create index idx_proof_uploads_status on proof_uploads(status);
create index idx_proof_uploads_created on proof_uploads(created_at desc);

-- Triggers: updated_at
create trigger inventory_items_updated_at
  before update on inventory_items
  for each row execute function update_updated_at();

-- Triggers: audit logging
create trigger audit_inventory_items
  after insert or update or delete on inventory_items
  for each row execute function audit_log_trigger();

create trigger audit_inventory_movements
  after insert or update or delete on inventory_movements
  for each row execute function audit_log_trigger();

create trigger audit_proof_uploads
  after insert or update or delete on proof_uploads
  for each row execute function audit_log_trigger();

-- RLS
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table proof_uploads enable row level security;

-- Inventory items: authenticated only
create policy "Authenticated can read inventory_items"
  on inventory_items for select to authenticated using (true);
create policy "Authenticated can insert inventory_items"
  on inventory_items for insert to authenticated with check (true);
create policy "Authenticated can update inventory_items"
  on inventory_items for update to authenticated using (true);

-- Inventory movements: authenticated only
create policy "Authenticated can read inventory_movements"
  on inventory_movements for select to authenticated using (true);
create policy "Authenticated can insert inventory_movements"
  on inventory_movements for insert to authenticated with check (true);
create policy "Authenticated can update inventory_movements"
  on inventory_movements for update to authenticated using (true);

-- Proof uploads: anon can INSERT (public upload), authenticated can do everything
create policy "Anyone can insert proof_uploads"
  on proof_uploads for insert to anon with check (true);
create policy "Authenticated can read proof_uploads"
  on proof_uploads for select to authenticated using (true);
create policy "Authenticated can update proof_uploads"
  on proof_uploads for update to authenticated using (true);
create policy "Authenticated can insert proof_uploads"
  on proof_uploads for insert to authenticated with check (true);

-- Trigger to auto-update inventory_items.current_stock on movement insert
create or replace function update_inventory_stock()
returns trigger as $$
begin
  update inventory_items
  set current_stock = current_stock + new.quantity
  where id = new.inventory_item_id;
  return new;
end;
$$ language plpgsql;

create trigger inventory_movement_stock_update
  after insert on inventory_movements
  for each row execute function update_inventory_stock();

-- Grant table access
grant all on inventory_items to anon, authenticated, service_role;
grant all on inventory_movements to anon, authenticated, service_role;
grant all on proof_uploads to anon, authenticated, service_role;
