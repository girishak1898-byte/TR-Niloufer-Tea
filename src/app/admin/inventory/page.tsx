'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, createInventoryItem, updateInventoryItem } from '@/app/admin/actions';
import type { InventoryItem } from '@/lib/types';

function stockStatus(item: InventoryItem) {
  if (item.current_stock <= 0) return 'out';
  if (item.current_stock <= item.low_stock_threshold) return 'low';
  return 'ok';
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchItems = useCallback(async () => {
    const result = await getInventoryItems();
    if (result.success) setItems(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleToggleActive(item: InventoryItem) {
    const result = await updateInventoryItem(item.id, { is_active: !item.is_active });
    if (result.success) {
      addToast(`${item.name} ${!item.is_active ? 'activated' : 'deactivated'}`, 'success');
      fetchItems();
    } else {
      addToast(result.error ?? 'Failed', 'error');
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="text-gray-500">Loading inventory...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.location.href = '/admin/inventory/movements'}>
            Movements
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Add Item</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Stock</th>
                <th className="px-6 py-3 font-medium">Unit</th>
                <th className="px-6 py-3 font-medium">Threshold</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No inventory items yet.</td></tr>
              ) : (
                items.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${!item.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-700">{Number(item.current_stock)}</td>
                      <td className="px-6 py-4 text-gray-500">{item.unit}</td>
                      <td className="px-6 py-4 text-gray-500">{Number(item.low_stock_threshold)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === 'out' ? 'bg-red-100 text-red-800' :
                          status === 'low' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>Edit</Button>
                          <Button variant={item.is_active ? 'secondary' : 'primary'} size="sm" onClick={() => handleToggleActive(item)}>
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddItemModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); addToast('Item created', 'success'); fetchItems(); }}
        onError={(err) => addToast(err, 'error')}
      />

      {editingItem && (
        <EditItemModal
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => { setEditingItem(null); addToast('Item updated', 'success'); fetchItems(); }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function AddItemModal({ open, onClose, onSuccess, onError }: {
  open: boolean; onClose: () => void; onSuccess: () => void; onError: (err: string) => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('5');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createInventoryItem({
      name, unit: unit || 'units',
      current_stock: parseFloat(stock) || 0,
      low_stock_threshold: parseFloat(threshold) || 5,
    });
    setSaving(false);
    if (result.success) { setName(''); setUnit(''); setStock('0'); setThreshold('5'); onSuccess(); }
    else onError(result.error ?? 'Failed');
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Inventory Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="inv-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tea Powder" required />
        <Input id="inv-unit" label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. kg, litres, packets" />
        <Input id="inv-stock" label="Current Stock" type="number" step="0.01" value={stock} onChange={(e) => setStock(e.target.value)} />
        <Input id="inv-threshold" label="Low Stock Threshold" type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditItemModal({ open, item, onClose, onSuccess, onError }: {
  open: boolean; item: InventoryItem; onClose: () => void; onSuccess: () => void; onError: (err: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [threshold, setThreshold] = useState(String(item.low_stock_threshold));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateInventoryItem(item.id, {
      name, unit,
      low_stock_threshold: parseFloat(threshold) || 5,
    });
    setSaving(false);
    if (result.success) onSuccess();
    else onError(result.error ?? 'Failed');
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Inventory Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="edit-inv-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input id="edit-inv-unit" label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <Input id="edit-inv-threshold" label="Low Stock Threshold" type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <p className="text-xs text-gray-500">To change stock, record a movement from the Movements page.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
