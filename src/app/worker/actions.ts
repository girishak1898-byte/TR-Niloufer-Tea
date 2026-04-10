'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { compare } from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  WorkerSession,
  CartItem,
  PaymentMode,
  ShiftSummary,
  SaleWithItems,
} from '@/lib/types';

const COOKIE_NAME = 'worker-session';
const SESSION_EXPIRY = '12h';

function getSecret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}

async function createSessionToken(payload: WorkerSession): Promise<string> {
  return new SignJWT({
    worker_id: payload.worker_id,
    worker_name: payload.worker_name,
    shift_id: payload.shift_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getSecret());
}

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60, // 12 hours
    path: '/',
  });
}

// --- Public Actions ---

export async function getWorkers() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('workers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: 'Failed to fetch workers', data: [] };
  }
}

export async function loginWorker(workerId: string, pin: string) {
  try {
    const supabase = createServiceClient();

    // Fetch worker with pin_hash
    const { data: worker, error } = await supabase
      .from('workers')
      .select('id, name, pin_hash, is_active')
      .eq('id', workerId)
      .single();

    if (error || !worker) {
      return { success: false, error: 'Worker not found' };
    }

    if (!worker.is_active) {
      return { success: false, error: 'Worker account is inactive' };
    }

    // Verify PIN
    const valid = await compare(pin, worker.pin_hash);
    if (!valid) {
      return { success: false, error: 'Invalid PIN' };
    }

    // Check for active shift
    const { data: activeShift } = await supabase
      .from('shifts')
      .select('id')
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .maybeSingle();

    const session: WorkerSession = {
      worker_id: worker.id,
      worker_name: worker.name,
      shift_id: activeShift?.id ?? null,
    };

    const token = await createSessionToken(session);
    await setSessionCookie(token);

    return { success: true, data: session };
  } catch (err) {
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

export async function logoutWorker() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Logout failed' };
  }
}

export async function getWorkerSession(): Promise<WorkerSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return {
      worker_id: payload.worker_id as string,
      worker_name: payload.worker_name as string,
      shift_id: (payload.shift_id as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function startShift(openingCash: number) {
  try {
    const session = await getWorkerSession();
    if (!session) return { success: false, error: 'Not logged in' };

    const supabase = createServiceClient();

    // Check for existing active shift
    const { data: existing } = await supabase
      .from('shifts')
      .select('id')
      .eq('worker_id', session.worker_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You already have an active shift' };
    }

    // Create new shift
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        worker_id: session.worker_id,
        status: 'active',
        started_at: new Date().toISOString(),
        opening_cash: openingCash,
      })
      .select('id')
      .single();

    if (error || !shift) {
      throw error ?? new Error('Failed to create shift');
    }

    // Update session cookie with shift_id
    const updatedSession: WorkerSession = {
      ...session,
      shift_id: shift.id,
    };
    const token = await createSessionToken(updatedSession);
    await setSessionCookie(token);

    return { success: true, data: { shift_id: shift.id } };
  } catch (err) {
    return { success: false, error: 'Failed to start shift' };
  }
}

export async function endShift(countedCash: number, closingNote: string) {
  try {
    const session = await getWorkerSession();
    if (!session) return { success: false, error: 'Not logged in' };
    if (!session.shift_id) return { success: false, error: 'No active shift' };

    const supabase = createServiceClient();

    // Fetch the shift to get opening_cash
    const { data: shiftRecord, error: shiftError } = await supabase
      .from('shifts')
      .select('opening_cash')
      .eq('id', session.shift_id)
      .single();

    if (shiftError || !shiftRecord) throw shiftError ?? new Error('Failed to fetch shift');

    // Query all completed cash sales for this shift
    const { data: cashSales, error: cashError } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('shift_id', session.shift_id)
      .eq('payment_mode', 'cash')
      .eq('status', 'completed');

    if (cashError) throw cashError;

    const sumCashSales = (cashSales ?? []).reduce((sum, s) => sum + s.total_amount, 0);
    const expected_cash = (shiftRecord.opening_cash ?? 0) + sumCashSales;
    const cash_difference = countedCash - expected_cash;

    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        expected_cash,
        counted_cash: countedCash,
        cash_difference,
        closing_note: closingNote,
      })
      .eq('id', session.shift_id);

    if (error) throw error;

    // Update session cookie to clear shift_id
    const updatedSession: WorkerSession = {
      ...session,
      shift_id: null,
    };
    const token = await createSessionToken(updatedSession);
    await setSessionCookie(token);

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to end shift' };
  }
}

export async function getActiveShift() {
  try {
    const session = await getWorkerSession();
    if (!session) return { success: false, error: 'Not logged in', data: null };

    const supabase = createServiceClient();
    const { data: shift, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('worker_id', session.worker_id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    return { success: true, data: shift };
  } catch (err) {
    return { success: false, error: 'Failed to fetch shift', data: null };
  }
}

export async function getProducts() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: 'Failed to fetch products', data: [] };
  }
}

export async function createSale(items: CartItem[], paymentMode: PaymentMode) {
  try {
    const session = await getWorkerSession();
    if (!session) return { success: false, error: 'Not logged in' };
    if (!session.shift_id) return { success: false, error: 'No active shift. Please start a shift first.' };

    if (!items.length) {
      return { success: false, error: 'Cart is empty' };
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );

    const supabase = createServiceClient();

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        shift_id: session.shift_id,
        worker_id: session.worker_id,
        worker_name_snapshot: session.worker_name,
        payment_mode: paymentMode,
        total_amount: totalAmount,
        status: 'completed',
      })
      .select('id')
      .single();

    if (saleError || !sale) {
      throw saleError ?? new Error('Failed to create sale');
    }

    // Create sale items with snapshot fields
    const saleItems = items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name,
      unit_price_snapshot: item.unit_price,
      quantity: item.quantity,
      subtotal: item.unit_price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    return { success: true, data: { sale_id: sale.id, total: totalAmount } };
  } catch (err) {
    return { success: false, error: 'Failed to create sale' };
  }
}

export async function getShiftSales(shiftId: string) {
  try {
    const supabase = createServiceClient();

    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    // Fetch items for all sales
    const saleIds = (sales ?? []).map((s) => s.id);
    let items: Record<string, any[]> = {};

    if (saleIds.length > 0) {
      const { data: allItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);

      if (itemsError) throw itemsError;

      // Group items by sale_id
      for (const item of allItems ?? []) {
        if (!items[item.sale_id]) items[item.sale_id] = [];
        items[item.sale_id].push(item);
      }
    }

    const salesWithItems: SaleWithItems[] = (sales ?? []).map((sale) => ({
      ...sale,
      items: items[sale.id] ?? [],
    }));

    return { success: true, data: salesWithItems };
  } catch (err) {
    return { success: false, error: 'Failed to fetch sales', data: [] };
  }
}

export async function getShiftSummary(shiftId: string) {
  try {
    const supabase = createServiceClient();

    const { data: sales, error } = await supabase
      .from('sales')
      .select('payment_mode, total_amount, status')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    if (error) throw error;

    // Fetch items count
    const { data: saleIds } = await supabase
      .from('sales')
      .select('id')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    let itemsSold = 0;
    if (saleIds && saleIds.length > 0) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('quantity')
        .in(
          'sale_id',
          saleIds.map((s) => s.id)
        );
      itemsSold = (items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    }

    const summary: ShiftSummary = {
      total_sales: (sales ?? []).length,
      total_amount: (sales ?? []).reduce((sum, s) => sum + s.total_amount, 0),
      cash_amount: (sales ?? [])
        .filter((s) => s.payment_mode === 'cash')
        .reduce((sum, s) => sum + s.total_amount, 0),
      online_amount: (sales ?? [])
        .filter((s) => s.payment_mode === 'online')
        .reduce((sum, s) => sum + s.total_amount, 0),
      cash_count: (sales ?? []).filter((s) => s.payment_mode === 'cash').length,
      online_count: (sales ?? []).filter((s) => s.payment_mode === 'online').length,
      items_sold: itemsSold,
    };

    return { success: true, data: summary };
  } catch (err) {
    return {
      success: false,
      error: 'Failed to fetch shift summary',
      data: null,
    };
  }
}

export async function voidSale(saleId: string, reason: string) {
  try {
    const session = await getWorkerSession();
    if (!session) return { success: false, error: 'Not logged in' };

    if (!reason.trim()) {
      return { success: false, error: 'Void reason is required' };
    }

    const supabase = createServiceClient();

    // Fetch the sale to verify ownership and time restriction
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('worker_id, created_at')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      return { success: false, error: 'Sale not found' };
    }

    if (sale.worker_id !== session.worker_id) {
      return { success: false, error: 'You can only void your own sales' };
    }

    if (new Date().getTime() - new Date(sale.created_at).getTime() >= 5 * 60 * 1000) {
      return { success: false, error: 'Can only void sales made in the last 5 minutes. Contact admin for older sales.' };
    }

    const { error } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: session.worker_id,
        void_reason: reason.trim(),
      })
      .eq('id', saleId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to void sale' };
  }
}
