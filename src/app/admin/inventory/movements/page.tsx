'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { getInventoryMovements, getInventoryItems, recordMovement } from '@/app/admin/actions';
import type { InventoryItem, InventoryMovementWithItem, MovementType } from '@/lib/types';

const TYPE_LABELS: Record<MovementType, string> = {
  purchase: 'Purchase',
  usage: 'Usage',
  adjustment: 'Adjustment',
  waste: 'Waste',
};

const TYPE_COLORS: Record<MovementType, string> = {
  purchase: 'bg-green-100 text-green-800',
  usage: 'bg-blue-100 text-blue-800',
  adjustment: 'bg-gray-100 text-gray-800',
  waste: 'bg-red-100 text-red-800',
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<InventoryMovementWithItem[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const fetchData = useCallback(async () => {
    const [movResult, itemResult] = await Promise.all([
      getInventoryMovements(),
      getInventoryItems(),
    ]);
    if (movResult.success) setMovements(movResult.data);
    if (itemResult.success) setItems(itemResult.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="text-gray-500">Loading movements...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="mt-1 text-sm text-gray-500">Record purchases, usage, waste, and adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.location.href = '/admin/inventory'}>
            Items
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Record Movement</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Qty</th>
                <th className="px-6 py-3 font-medium">Note</th>
                <th className="px-6 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No movements recorded yet.</td></tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 text-gray-700">{formatDateTime(m.created_at)}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{m.item_name}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[m.movement_type as MovementType]}`}>
                        {TYPE_LABELS[m.movement_type as MovementType]}
                      </span>
                    </td>
                    <td className={`px-6 py-3 font-medium ${Number(m.quantity) > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity)}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-3 text-gray-500">{m.note ?? '-'}</td>
                    <td className="px-6 py-3 text-gray-500">{m.performed_by ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordMovementModal
        open={showAddModal}
        items={items.filter((i) => i.is_active)}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); addToast('Movement recorded', 'success'); fetchData(); }}
        onError={(err) => addToast(err, 'error')}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function RecordMovementModal({ open, items, onClose, onSuccess, onError }: {
  open: boolean; items: InventoryItem[]; onClose: () => void; onSuccess: () => void; onError: (err: string) => void;
}) {
  const [itemId, setItemId] = useState('');
  const [type, setType] = useState<MovementType>('purchase');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId) { onError('Select an item'); return; }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { onError('Quantity must be greater than 0'); return; }

    setSaving(true);
    const result = await recordMovement({
      inventory_item_id: itemId,
      movement_type: type,
      quantity: qty,
      note: note || undefined,
    });
    setSaving(false);
    if (result.success) { setItemId(''); setType('purchase'); setQuantity(''); setNote(''); onSuccess(); }
    else onError(result.error ?? 'Failed');
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Stock Movement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mov-item" className="mb-1 block text-sm font-medium text-gray-700">Item</label>
          <select
            id="mov-item"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
          >
            <option value="">Select item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({Number(item.current_stock)} {item.unit})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mov-type" className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select
            id="mov-type"
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
          >
            <option value="purchase">Purchase (adds stock)</option>
            <option value="usage">Usage (removes stock)</option>
            <option value="waste">Waste (removes stock)</option>
            <option value="adjustment">Adjustment (+/-)</option>
          </select>
        </div>

        <Input
          id="mov-qty"
          label={type === 'adjustment' ? 'Quantity (positive to add, negative to remove)' : 'Quantity'}
          type="number"
          step="0.01"
          min={type === 'adjustment' ? undefined : '0.01'}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <Input
          id="mov-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Weekly purchase from Metro"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Recording...' : 'Record'}</Button>
        </div>
      </form>
    </Modal>
  );
}
