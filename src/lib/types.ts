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
