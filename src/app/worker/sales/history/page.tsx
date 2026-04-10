'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatTime, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { SaleWithItems } from '@/lib/types';
import {
  getWorkerSession,
  getShiftSales,
  voidSale,
} from '@/app/worker/actions';

export default function SalesHistoryPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState<string | null>(null);

  // Void modal state
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const loadSales = useCallback(async (sid: string) => {
    const result = await getShiftSales(sid);
    if (result.success) {
      setSales(result.data as SaleWithItems[]);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const session = await getWorkerSession();
      if (!session) {
        router.push('/worker/login');
        return;
      }
      if (!session.shift_id) {
        addToast('No active shift', 'error');
        router.push('/worker/dashboard');
        return;
      }
      setShiftId(session.shift_id);
      await loadSales(session.shift_id);
      setLoading(false);
    }
    load();
  }, [router, addToast, loadSales]);

  async function handleVoid() {
    if (!voidingSaleId || !voidReason.trim()) return;
    setVoidLoading(true);

    const result = await voidSale(voidingSaleId, voidReason);
    if (result.success) {
      addToast('Sale voided', 'success');
      setVoidingSaleId(null);
      setVoidReason('');
      if (shiftId) await loadSales(shiftId);
    } else {
      addToast(result.error ?? 'Failed to void sale', 'error');
    }
    setVoidLoading(false);
  }

  async function handleRefresh() {
    if (shiftId) {
      setLoading(true);
      await loadSales(shiftId);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-chai-200 border-t-chai-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Sales History</h2>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {sales.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No sales recorded this shift yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => {
            const isVoided = sale.status === 'voided';
            return (
              <div
                key={sale.id}
                className={cn(
                  'rounded-xl border bg-white p-4 shadow-sm transition-all',
                  isVoided ? 'border-red-200 opacity-60' : 'border-gray-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn(isVoided && 'line-through')}>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total_amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatTime(sale.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        sale.payment_mode === 'cash'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {sale.payment_mode === 'cash' ? 'Cash' : 'Online'}
                    </span>
                    {isVoided && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Voided
                      </span>
                    )}
                  </div>
                </div>

                {/* Items summary */}
                <p
                  className={cn(
                    'mt-2 text-xs text-gray-600',
                    isVoided && 'line-through'
                  )}
                >
                  {sale.items
                    .map(
                      (item) =>
                        `${item.product_name_snapshot}${item.quantity > 1 ? ` x${item.quantity}` : ''}`
                    )
                    .join(', ')}
                </p>

                {/* Void reason */}
                {isVoided && sale.void_reason && (
                  <p className="mt-1 text-xs italic text-red-500">
                    Reason: {sale.void_reason}
                  </p>
                )}

                {/* Void button for completed sales (within 5 min) */}
                {(() => {
                  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                  const canVoid = !isVoided && new Date(sale.created_at).getTime() > fiveMinutesAgo;
                  return canVoid ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setVoidingSaleId(sale.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Void Sale
                      </button>
                      <span className="text-xs text-gray-400">Can void within 5 min</span>
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Void Sale Modal */}
      <Modal
        open={!!voidingSaleId}
        onClose={() => {
          setVoidingSaleId(null);
          setVoidReason('');
        }}
        title="Void Sale"
      >
        <p className="mb-4 text-sm text-gray-600">
          This will mark the sale as voided. Please provide a reason.
        </p>
        <Input
          label="Reason"
          placeholder="e.g. Wrong order, customer cancelled"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
        />
        <div className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setVoidingSaleId(null);
              setVoidReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleVoid}
            disabled={!voidReason.trim() || voidLoading}
          >
            {voidLoading ? 'Voiding...' : 'Void Sale'}
          </Button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
