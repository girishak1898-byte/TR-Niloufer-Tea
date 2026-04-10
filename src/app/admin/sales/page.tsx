'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getSales, voidSale, getWorkers } from '@/app/admin/actions';
import type { SaleWithItems } from '@/lib/types';

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const { toasts, addToast, removeToast } = useToast();

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [status, setStatus] = useState('');

  const limit = 20;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const result = await getSales({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      workerId: workerId || undefined,
      paymentMode: paymentMode || undefined,
      status: status || undefined,
      page,
      limit,
    });

    if (result.success) {
      setSales(result.data);
      setTotal(result.total);
    }
    setLoading(false);
  }, [startDate, endDate, workerId, paymentMode, status, page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    getWorkers().then((result) => {
      if (result.success) {
        setWorkers(result.data.map((w) => ({ id: w.id, name: w.name })));
      }
    });
  }, []);

  function handleFilter() {
    setPage(1);
    fetchSales();
  }

  function handleClearFilters() {
    setStartDate('');
    setEndDate('');
    setWorkerId('');
    setPaymentMode('');
    setStatus('');
    setPage(1);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales</h1>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input
            id="filter-start-date"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            id="filter-end-date"
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="w-full">
            <label htmlFor="filter-worker" className="mb-1.5 block text-sm font-medium text-gray-700">
              Employee
            </label>
            <select
              id="filter-worker"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-chai-500 focus:outline-none focus:ring-2 focus:ring-chai-500/20"
            >
              <option value="">All Employees</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filter-payment" className="mb-1.5 block text-sm font-medium text-gray-700">
              Payment Mode
            </label>
            <select
              id="filter-payment"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-chai-500 focus:outline-none focus:ring-2 focus:ring-chai-500/20"
            >
              <option value="">All Modes</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filter-status" className="mb-1.5 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-chai-500 focus:outline-none focus:ring-2 focus:ring-chai-500/20"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="voided">Voided</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleFilter} size="md">
              Filter
            </Button>
            <Button onClick={handleClearFilters} variant="ghost" size="md">
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">Loading sales...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Date/Time</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No sales found matching your filters.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      expanded={expandedSale === sale.id}
                      onToggle={() =>
                        setExpandedSale(expandedSale === sale.id ? null : sale.id)
                      }
                      onVoid={() => setVoidingId(sale.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} sales
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {voidingId && (
        <VoidSaleModal
          open={!!voidingId}
          saleId={voidingId}
          onClose={() => setVoidingId(null)}
          onSuccess={() => {
            setVoidingId(null);
            addToast('Sale voided successfully', 'success');
            fetchSales();
          }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function SaleRow({
  sale,
  expanded,
  onToggle,
  onVoid,
}: {
  sale: SaleWithItems;
  expanded: boolean;
  onToggle: () => void;
  onVoid: () => void;
}) {
  const isVoided = sale.status === 'voided';
  const itemsSummary = sale.items.map((i) => `${i.product_name_snapshot} x${i.quantity}`).join(', ');

  return (
    <>
      <tr className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50/50 text-gray-400' : ''}`}>
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Expand sale details"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3">{formatDateTime(sale.created_at)}</td>
        <td className="px-4 py-3">{sale.worker_name_snapshot}</td>
        <td className="max-w-[200px] truncate px-4 py-3" title={itemsSummary}>
          {itemsSummary}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              sale.payment_mode === 'cash'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {sale.payment_mode}
          </span>
        </td>
        <td className={`px-4 py-3 text-right font-medium ${isVoided ? 'line-through' : ''}`}>
          {formatCurrency(sale.total_amount)}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              isVoided ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {sale.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {!isVoided && (
            <Button variant="danger" size="sm" onClick={onVoid}>
              Void
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className={isVoided ? 'bg-red-50/30' : 'bg-gray-50/50'}>
          <td colSpan={8} className="px-8 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Sale Items</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium">Unit Price</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5">{item.product_name_snapshot}</td>
                      <td className="py-1.5">{formatCurrency(item.unit_price_snapshot)}</td>
                      <td className="py-1.5">{item.quantity}</td>
                      <td className="py-1.5 text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isVoided && sale.void_reason && (
                <div className="rounded-lg bg-red-100 px-4 py-2 text-sm">
                  <span className="font-medium text-red-800">Void reason:</span>{' '}
                  <span className="text-red-700">{sale.void_reason}</span>
                  {sale.voided_by && (
                    <span className="text-red-600"> (by {sale.voided_by})</span>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function VoidSaleModal({
  open,
  saleId,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  saleId: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (err: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      onError('Please provide a reason for voiding');
      return;
    }
    setProcessing(true);
    const result = await voidSale(saleId, reason);
    setProcessing(false);

    if (result.success) {
      onSuccess();
    } else {
      onError(result.error ?? 'Failed to void sale');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Void Sale">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          This action cannot be undone. The sale will be marked as voided and excluded from
          revenue calculations.
        </p>
        <Input
          id="void-reason"
          label="Reason for voiding"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer requested refund"
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={processing}>
            {processing ? 'Voiding...' : 'Void Sale'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
