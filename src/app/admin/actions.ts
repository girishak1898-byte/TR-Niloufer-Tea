'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { hash } from 'bcryptjs';
import type {
  Worker,
  Product,
  SaleWithItems,
  DailySummary,
  AuditLog,
  InventoryItem,
  InventoryMovementWithItem,
  ProofUpload,
  MovementType,
  ProofStatus,
} from '@/lib/types';

// ---------- Auth ----------

export async function adminLogin(email: string, password: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

export async function adminLogout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch {
    return { success: false, error: 'Logout failed' };
  }
}

// ---------- Dashboard ----------

export async function getAdminDashboardStats() {
  try {
    const supabase = createServiceClient();

    // Get today's date range (IST-friendly: use local midnight)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Fetch today's completed sales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, payment_mode, total_amount, status, worker_id, worker_name_snapshot')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay)
      .eq('status', 'completed');

    if (salesError) throw salesError;

    const completedSales = sales ?? [];

    // Fetch items sold today
    const saleIds = completedSales.map((s) => s.id);
    let itemsSold = 0;
    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('quantity')
        .in('sale_id', saleIds);
      itemsSold = (items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    }

    // Active workers (workers with active shifts)
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('worker_id')
      .eq('status', 'active');

    const activeWorkerCount = new Set((activeShifts ?? []).map((s) => s.worker_id)).size;

    // Top items today
    const { data: todayItems } = await supabase
      .from('sale_items')
      .select('product_name_snapshot, quantity, sale_id')
      .in('sale_id', saleIds);

    const itemCounts = new Map<string, number>();
    for (const item of todayItems ?? []) {
      const current = itemCounts.get(item.product_name_snapshot) ?? 0;
      itemCounts.set(item.product_name_snapshot, current + item.quantity);
    }
    const top_items = Array.from(itemCounts.entries())
      .map(([name, qty]) => ({ name, quantity: qty }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Worker performance today
    const workerPerf = new Map<string, { name: string; sales: number; revenue: number }>();
    for (const sale of completedSales) {
      const existing = workerPerf.get(sale.worker_id) ?? { name: sale.worker_name_snapshot, sales: 0, revenue: 0 };
      existing.sales += 1;
      existing.revenue += sale.total_amount;
      workerPerf.set(sale.worker_id, existing);
    }
    const worker_performance = Array.from(workerPerf.values())
      .sort((a, b) => b.revenue - a.revenue);

    return {
      success: true,
      data: {
        total_sales: completedSales.length,
        total_revenue: completedSales.reduce((sum, s) => sum + s.total_amount, 0),
        cash_total: completedSales
          .filter((s) => s.payment_mode === 'cash')
          .reduce((sum, s) => sum + s.total_amount, 0),
        online_total: completedSales
          .filter((s) => s.payment_mode === 'online')
          .reduce((sum, s) => sum + s.total_amount, 0),
        active_workers: activeWorkerCount,
        items_sold: itemsSold,
        top_items,
        worker_performance,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch dashboard stats',
      data: null,
    };
  }
}

// ---------- Workers ----------

export async function getWorkers() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, is_active, created_at, updated_at')
      .order('name');

    if (error) throw error;
    return { success: true, data: (data ?? []) as Omit<Worker, 'pin_hash'>[] };
  } catch {
    return { success: false, error: 'Failed to fetch workers', data: [] };
  }
}

export async function createWorker(name: string, pin: string) {
  try {
    if (!name.trim()) return { success: false, error: 'Name is required' };
    if (!pin || pin.length < 4) return { success: false, error: 'PIN must be at least 4 digits' };

    const supabase = createServiceClient();
    const pinHash = await hash(pin, 10);

    const { data, error } = await supabase
      .from('workers')
      .insert({
        name: name.trim(),
        pin_hash: pinHash,
        is_active: true,
      })
      .select('id, name, is_active, created_at, updated_at')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to create worker' };
  }
}

export async function updateWorker(
  id: string,
  data: { name?: string; pin?: string; is_active?: boolean }
) {
  try {
    const supabase = createServiceClient();
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
    if (data.pin) {
      updatePayload.pin_hash = await hash(data.pin, 10);
    }

    const { error } = await supabase
      .from('workers')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update worker' };
  }
}

// ---------- Products ----------

export async function getProducts() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return { success: true, data: (data ?? []) as Product[] };
  } catch {
    return { success: false, error: 'Failed to fetch products', data: [] };
  }
}

export async function createProduct(data: {
  name: string;
  price_pence: number;
  category: string;
  sort_order: number;
}) {
  try {
    if (!data.name.trim()) return { success: false, error: 'Name is required' };
    if (data.price_pence <= 0) return { success: false, error: 'Price must be greater than 0' };

    const supabase = createServiceClient();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: data.name.trim(),
        price_pence: data.price_pence,
        category: data.category.trim(),
        sort_order: data.sort_order,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data: product };
  } catch {
    return { success: false, error: 'Failed to create product' };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    price_pence?: number;
    category?: string;
    is_active?: boolean;
    sort_order?: number;
  }
) {
  try {
    const supabase = createServiceClient();
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.price_pence !== undefined) updatePayload.price_pence = data.price_pence;
    if (data.category !== undefined) updatePayload.category = data.category.trim();
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
    if (data.sort_order !== undefined) updatePayload.sort_order = data.sort_order;

    const { error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update product' };
  }
}

// ---------- Sales ----------

export async function getSales(filters: {
  startDate?: string;
  endDate?: string;
  workerId?: string;
  paymentMode?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabase = createServiceClient();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      // Include the full end date day
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }
    if (filters.workerId) {
      query = query.eq('worker_id', filters.workerId);
    }
    if (filters.paymentMode) {
      query = query.eq('payment_mode', filters.paymentMode);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: sales, error, count } = await query;
    if (error) throw error;

    // Fetch sale items for these sales
    const saleIds = (sales ?? []).map((s) => s.id);
    let itemsMap: Record<string, unknown[]> = {};

    if (saleIds.length > 0) {
      const { data: allItems } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);

      for (const item of allItems ?? []) {
        if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
        itemsMap[item.sale_id].push(item);
      }
    }

    const salesWithItems: SaleWithItems[] = (sales ?? []).map((sale) => ({
      ...sale,
      items: (itemsMap[sale.id] ?? []) as SaleWithItems['items'],
    }));

    return {
      success: true,
      data: salesWithItems,
      total: count ?? 0,
      page,
      limit,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch sales',
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };
  }
}

export async function voidSale(saleId: string, reason: string) {
  try {
    if (!reason.trim()) {
      return { success: false, error: 'Void reason is required' };
    }

    const supabase = createServiceClient();

    // Get admin user info
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    const { error } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: user?.email ?? 'admin',
        void_reason: reason.trim(),
      })
      .eq('id', saleId)
      .eq('status', 'completed');

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to void sale' };
  }
}

// ---------- Reports ----------

export async function getReportData(startDate: string, endDate: string) {
  try {
    const supabase = createServiceClient();

    // Adjust end date to include the full day
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDateISO = endDateObj.toISOString();

    // Fetch all completed sales in range
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDateISO)
      .eq('status', 'completed')
      .order('created_at');

    if (salesError) throw salesError;

    const allSales = sales ?? [];
    const saleIds = allSales.map((s) => s.id);

    // Fetch all sale items
    let allItems: { sale_id: string; product_id: string; product_name_snapshot: string; quantity: number; subtotal: number }[] = [];
    if (saleIds.length > 0) {
      // Batch fetch in chunks if needed
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, product_name_snapshot, quantity, subtotal')
        .in('sale_id', saleIds);

      if (itemsError) throw itemsError;
      allItems = items ?? [];
    }

    // Daily summaries
    const dailyMap = new Map<string, DailySummary>();
    for (const sale of allSales) {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) ?? {
        date,
        total_sales: 0,
        total_amount: 0,
        cash_amount: 0,
        online_amount: 0,
      };
      existing.total_sales += 1;
      existing.total_amount += sale.total_amount;
      if (sale.payment_mode === 'cash') existing.cash_amount += sale.total_amount;
      else existing.online_amount += sale.total_amount;
      dailyMap.set(date, existing);
    }

    // Worker-wise totals
    const workerMap = new Map<string, { worker_id: string; worker_name: string; total_sales: number; total_revenue: number }>();
    for (const sale of allSales) {
      const existing = workerMap.get(sale.worker_id) ?? {
        worker_id: sale.worker_id,
        worker_name: sale.worker_name_snapshot,
        total_sales: 0,
        total_revenue: 0,
      };
      existing.total_sales += 1;
      existing.total_revenue += sale.total_amount;
      workerMap.set(sale.worker_id, existing);
    }

    // Product-wise totals
    const productMap = new Map<string, { product_id: string; product_name: string; quantity_sold: number; total_revenue: number }>();
    for (const item of allItems) {
      const existing = productMap.get(item.product_id) ?? {
        product_id: item.product_id,
        product_name: item.product_name_snapshot,
        quantity_sold: 0,
        total_revenue: 0,
      };
      existing.quantity_sold += item.quantity;
      existing.total_revenue += item.subtotal;
      productMap.set(item.product_id, existing);
    }

    // Payment mode breakdown
    const cashSales = allSales.filter((s) => s.payment_mode === 'cash');
    const onlineSales = allSales.filter((s) => s.payment_mode === 'online');

    return {
      success: true,
      data: {
        daily_summaries: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        worker_totals: Array.from(workerMap.values()).sort((a, b) => b.total_revenue - a.total_revenue),
        product_totals: Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue),
        payment_breakdown: {
          cash: { count: cashSales.length, total: cashSales.reduce((s, x) => s + x.total_amount, 0) },
          online: { count: onlineSales.length, total: onlineSales.reduce((s, x) => s + x.total_amount, 0) },
        },
        total_sales: allSales.length,
        total_revenue: allSales.reduce((s, x) => s + x.total_amount, 0),
      },
    };
  } catch {
    return { success: false, error: 'Failed to generate report', data: null };
  }
}

export async function exportSalesCSV(startDate: string, endDate: string) {
  try {
    const supabase = createServiceClient();

    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);

    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', startDate)
      .lt('created_at', endDateObj.toISOString())
      .order('created_at');

    if (error) throw error;

    const allSales = sales ?? [];
    const saleIds = allSales.map((s) => s.id);

    let itemsMap: Record<string, string[]> = {};
    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, product_name_snapshot, quantity')
        .in('sale_id', saleIds);

      for (const item of items ?? []) {
        if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
        itemsMap[item.sale_id].push(`${item.product_name_snapshot} x${item.quantity}`);
      }
    }

    const rows = [
      'Date,Time,Worker,Items,Payment Mode,Total,Status',
      ...allSales.map((sale) => {
        const dt = new Date(sale.created_at);
        const date = dt.toLocaleDateString('en-GB');
        const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const items = (itemsMap[sale.id] ?? []).join('; ');
        // Escape CSV fields that may contain commas
        const escapedItems = items.includes(',') ? `"${items}"` : items;
        return `${date},${time},${sale.worker_name_snapshot},${escapedItems},${sale.payment_mode},${sale.total_amount},${sale.status}`;
      }),
    ];

    return { success: true, data: rows.join('\n') };
  } catch {
    return { success: false, error: 'Failed to export CSV' };
  }
}

// ---------- Shifts ----------

export async function getActiveShifts() {
  try {
    const supabase = createServiceClient();

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('id, worker_id, started_at, status')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) throw error;

    // Get worker names
    const workerIds = (shifts ?? []).map((s) => s.worker_id);
    let workerNames: Record<string, string> = {};

    if (workerIds.length > 0) {
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name')
        .in('id', workerIds);

      for (const w of workers ?? []) {
        workerNames[w.id] = w.name;
      }
    }

    const shiftsWithNames = (shifts ?? []).map((s) => ({
      ...s,
      worker_name: workerNames[s.worker_id] ?? 'Unknown',
    }));

    return { success: true, data: shiftsWithNames };
  } catch {
    return { success: false, error: 'Failed to fetch active shifts', data: [] };
  }
}

// ---------- Audit Logs ----------

export async function getAuditLogs(page?: number, limit?: number) {
  try {
    const supabase = createServiceClient();
    const p = page ?? 1;
    const l = limit ?? 50;
    const offset = (p - 1) * l;

    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('performed_at', { ascending: false })
      .range(offset, offset + l - 1);

    if (error) throw error;

    return {
      success: true,
      data: (data ?? []) as AuditLog[],
      total: count ?? 0,
      page: p,
      limit: l,
    };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch audit logs',
      data: [],
      total: 0,
      page: 1,
      limit: 50,
    };
  }
}

// ---------- Recent Sales (for dashboard) ----------

export async function getRecentSales(limit: number = 10) {
  try {
    const supabase = createServiceClient();

    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const saleIds = (sales ?? []).map((s) => s.id);
    let itemsMap: Record<string, unknown[]> = {};

    if (saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);

      for (const item of items ?? []) {
        if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
        itemsMap[item.sale_id].push(item);
      }
    }

    const salesWithItems: SaleWithItems[] = (sales ?? []).map((sale) => ({
      ...sale,
      items: (itemsMap[sale.id] ?? []) as SaleWithItems['items'],
    }));

    return { success: true, data: salesWithItems };
  } catch {
    return { success: false, error: 'Failed to fetch recent sales', data: [] };
  }
}

// ---------- Inventory Items ----------

export async function getInventoryItems() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');

    if (error) throw error;
    return { success: true, data: (data ?? []) as InventoryItem[] };
  } catch {
    return { success: false, error: 'Failed to fetch inventory items', data: [] };
  }
}

export async function createInventoryItem(itemData: {
  name: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
}) {
  try {
    if (!itemData.name.trim()) return { success: false, error: 'Name is required' };

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        name: itemData.name.trim(),
        unit: itemData.unit.trim() || 'units',
        current_stock: itemData.current_stock,
        low_stock_threshold: itemData.low_stock_threshold,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to create inventory item' };
  }
}

export async function updateInventoryItem(
  id: string,
  itemData: { name?: string; unit?: string; low_stock_threshold?: number; is_active?: boolean }
) {
  try {
    const supabase = createServiceClient();
    const payload: Record<string, unknown> = {};
    if (itemData.name !== undefined) payload.name = itemData.name.trim();
    if (itemData.unit !== undefined) payload.unit = itemData.unit.trim();
    if (itemData.low_stock_threshold !== undefined) payload.low_stock_threshold = itemData.low_stock_threshold;
    if (itemData.is_active !== undefined) payload.is_active = itemData.is_active;

    const { error } = await supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update inventory item' };
  }
}

// ---------- Inventory Movements ----------

export async function recordMovement(movementData: {
  inventory_item_id: string;
  movement_type: MovementType;
  quantity: number;
  note?: string;
}) {
  try {
    const supabase = createServiceClient();
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Enforce sign: usage/waste are negative, purchase/adjustment keep user sign
    let qty = movementData.quantity;
    if ((movementData.movement_type === 'usage' || movementData.movement_type === 'waste') && qty > 0) {
      qty = -qty;
    }

    const { error } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_item_id: movementData.inventory_item_id,
        movement_type: movementData.movement_type,
        quantity: qty,
        note: movementData.note?.trim() || null,
        performed_by: user?.email ?? 'admin',
      });

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to record movement' };
  }
}

export async function getInventoryMovements(filters?: {
  itemId?: string;
  limit?: number;
}) {
  try {
    const supabase = createServiceClient();
    const limit = filters?.limit ?? 50;

    let query = supabase
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.itemId) {
      query = query.eq('inventory_item_id', filters.itemId);
    }

    const { data: movements, error } = await query;
    if (error) throw error;

    // Join item names
    const itemIds = [...new Set((movements ?? []).map((m) => m.inventory_item_id))];
    let itemNames: Record<string, string> = {};
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from('inventory_items')
        .select('id, name')
        .in('id', itemIds);
      for (const item of items ?? []) {
        itemNames[item.id] = item.name;
      }
    }

    const result: InventoryMovementWithItem[] = (movements ?? []).map((m) => ({
      ...m,
      item_name: itemNames[m.inventory_item_id] ?? 'Unknown',
    }));

    return { success: true, data: result };
  } catch {
    return { success: false, error: 'Failed to fetch movements', data: [] };
  }
}

// ---------- Proof Uploads ----------

export async function getProofs(filters?: {
  status?: ProofStatus;
  limit?: number;
}) {
  try {
    const supabase = createServiceClient();
    const limit = filters?.limit ?? 50;

    let query = supabase
      .from('proof_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as ProofUpload[] };
  } catch {
    return { success: false, error: 'Failed to fetch proofs', data: [] };
  }
}

export async function getProofSignedUrl(storagePath: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from('proof-uploads')
      .createSignedUrl(storagePath, 60);

    if (error) throw error;
    return { success: true, url: data.signedUrl };
  } catch {
    return { success: false, error: 'Failed to get file URL' };
  }
}

export async function reviewProof(
  proofId: string,
  action: 'approved' | 'rejected',
  reviewNote?: string
) {
  try {
    const supabase = createServiceClient();
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    const { error } = await supabase
      .from('proof_uploads')
      .update({
        status: action,
        reviewed_by: user?.email ?? 'admin',
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote?.trim() || null,
      })
      .eq('id', proofId);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to review proof' };
  }
}

export async function linkProofToMovement(proofId: string, movementId: string) {
  try {
    const supabase = createServiceClient();

    // Verify proof is approved
    const { data: proof } = await supabase
      .from('proof_uploads')
      .select('status')
      .eq('id', proofId)
      .single();

    if (proof?.status !== 'approved') {
      return { success: false, error: 'Only approved proofs can be linked' };
    }

    // Update both sides
    const { error: e1 } = await supabase
      .from('proof_uploads')
      .update({ linked_movement_id: movementId })
      .eq('id', proofId);

    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from('inventory_movements')
      .update({ proof_upload_id: proofId })
      .eq('id', movementId);

    if (e2) throw e2;

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to link proof to movement' };
  }
}

// ---------- Inventory Dashboard Stats ----------

export async function getInventoryDashboardStats() {
  try {
    const supabase = createServiceClient();

    const { data: items } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true);

    const allItems = (items ?? []) as InventoryItem[];
    const lowStock = allItems.filter((i) => i.current_stock > 0 && i.current_stock <= i.low_stock_threshold);
    const outOfStock = allItems.filter((i) => i.current_stock <= 0);

    const { data: pendingProofs } = await supabase
      .from('proof_uploads')
      .select('id')
      .eq('status', 'pending');

    const { data: recentMovements } = await supabase
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Join item names for movements
    const movementItemIds = [...new Set((recentMovements ?? []).map((m) => m.inventory_item_id))];
    let itemNames: Record<string, string> = {};
    if (movementItemIds.length > 0) {
      const { data: nameData } = await supabase
        .from('inventory_items')
        .select('id, name')
        .in('id', movementItemIds);
      for (const n of nameData ?? []) {
        itemNames[n.id] = n.name;
      }
    }

    return {
      success: true,
      data: {
        low_stock: lowStock,
        out_of_stock: outOfStock,
        pending_proofs_count: (pendingProofs ?? []).length,
        recent_movements: (recentMovements ?? []).map((m) => ({
          ...m,
          item_name: itemNames[m.inventory_item_id] ?? 'Unknown',
        })) as InventoryMovementWithItem[],
      },
    };
  } catch {
    return { success: false, error: 'Failed to fetch inventory stats', data: null };
  }
}
