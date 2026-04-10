'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getProducts, createProduct, updateProduct } from '@/app/admin/actions';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchProducts = useCallback(async () => {
    const result = await getProducts();
    if (result.success) {
      setProducts(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleToggleActive(product: Product) {
    const result = await updateProduct(product.id, { is_active: !product.is_active });
    if (result.success) {
      addToast(
        `${product.name} ${!product.is_active ? 'activated' : 'deactivated'}`,
        'success'
      );
      fetchProducts();
    } else {
      addToast(result.error ?? 'Failed to update product', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => setShowAddModal(true)}>Add Product</Button>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Sort Order</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No products found. Add your first product to get started.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 ${!product.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-gray-700">{formatCurrency(product.price_pence)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.sort_order}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={product.is_active ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleActive(product)}
                        >
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          addToast('Product created successfully', 'success');
          fetchProducts();
        }}
        onError={(err) => addToast(err, 'error')}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          open={!!editingProduct}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            addToast('Product updated successfully', 'success');
            fetchProducts();
          }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function AddProductModal({
  open,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (err: string) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await createProduct({
      name,
      price_pence: Math.round(parseFloat(price) * 100),
      category,
      sort_order: parseInt(sortOrder, 10),
    });

    setSaving(false);

    if (result.success) {
      setName('');
      setPrice('');
      setCategory('');
      setSortOrder('0');
      onSuccess();
    } else {
      onError(result.error ?? 'Failed to create product');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="product-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Masala Chai"
          required
        />
        <Input
          id="product-price"
          label="Price (GBP)"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="1.20"
          required
        />
        <Input
          id="product-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Tea, Snacks"
          required
        />
        <Input
          id="product-sort-order"
          label="Sort Order"
          type="number"
          min="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="0"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditProductModal({
  open,
  product,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
  onError: (err: string) => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.price_pence / 100).toFixed(2));
  const [category, setCategory] = useState(product.category);
  const [sortOrder, setSortOrder] = useState(String(product.sort_order));
  const [isActive, setIsActive] = useState(product.is_active);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await updateProduct(product.id, {
      name,
      price_pence: Math.round(parseFloat(price) * 100),
      category,
      sort_order: parseInt(sortOrder, 10),
      is_active: isActive,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
    } else {
      onError(result.error ?? 'Failed to update product');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="edit-product-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="edit-product-price"
          label="Price (GBP)"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <Input
          id="edit-product-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <Input
          id="edit-product-sort-order"
          label="Sort Order"
          type="number"
          min="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
          <span className="text-sm font-medium text-gray-700">Active</span>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
