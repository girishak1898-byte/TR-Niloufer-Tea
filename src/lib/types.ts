export interface Worker {
  id: string;
  name: string;
  pin_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  price_pence: number;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  worker_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  opening_cash: number;
  expected_cash: number;
  counted_cash: number | null;
  cash_difference: number | null;
  closing_note: string | null;
  created_at: string;
}

export type PaymentMode = 'cash' | 'online';
export type SaleStatus = 'completed' | 'voided';

export interface Sale {
  id: string;
  shift_id: string;
  worker_id: string;
  worker_name_snapshot: string;
  payment_mode: PaymentMode;
  total_amount: number;
  status: SaleStatus;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface WorkerSession {
  worker_id: string;
  worker_name: string;
  shift_id: string | null;
}

export interface ShiftSummary {
  total_sales: number;
  total_amount: number;
  cash_amount: number;
  online_amount: number;
  cash_count: number;
  online_count: number;
  items_sold: number;
}

// ---------- Inventory ----------

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'purchase' | 'usage' | 'adjustment' | 'waste';

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  movement_type: MovementType;
  quantity: number;
  note: string | null;
  proof_upload_id: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface InventoryMovementWithItem extends InventoryMovement {
  item_name: string;
}

export type ProofStatus = 'pending' | 'approved' | 'rejected';

export interface ProofUpload {
  id: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  submitted_name: string | null;
  item_name: string | null;
  supplier_name: string | null;
  uploader_note: string | null;
  status: ProofStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  linked_movement_id: string | null;
  created_at: string;
}

// ---------- Offline ----------

export interface QueuedAction {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
}

export interface DailySummary {
  date: string;
  total_sales: number;
  total_amount: number;
  cash_amount: number;
  online_amount: number;
}
