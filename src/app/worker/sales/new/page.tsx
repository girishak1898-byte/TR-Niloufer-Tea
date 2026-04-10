'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import type { Product, CartItem, PaymentMode } from '@/lib/types';
import {
  getWorkerSession,
  getProducts,
  createSale,
} from '@/app/worker/actions';

const CATEGORIES = ['drinks', 'snacks'] as const;
type Category = (typeof CATEGORIES)[number];

export default function NewSalePage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('drinks');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [cartExpanded, setCartExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await getWorkerSession();
      if (!session) {
        router.push('/worker/login');
        return;
      }
      if (!session.shift_id) {
        addToast('Please start a shift first', 'error');
        router.push('/worker/dashboard');
        return;
      }

      const result = await getProducts();
      if (result.success) {
        setProducts(result.data);
      } else {
        addToast('Failed to load products', 'error');
      }
      setLoading(false);
    }
    load();
  }, [router, addToast]);

  const handleAddItem = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price_pence,
          quantity: 1,
        },
      ];
    });
  }, []);

  const handleUpdateQuantity = useCallback(
    (productId: string, delta: number) => {
      setCart((prev) =>
        prev
          .map((item) =>
            item.product_id === productId
              ? { ...item, quantity: item.quantity + delta }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    },
    []
  );

  async function handleSaveSale() {
    if (cart.length === 0 || !paymentMode || submitting) return;
    setSubmitting(true);

    const result = await createSale(cart, paymentMode);
    if (result.success) {
      setCart([]);
      setPaymentMode(null);
      setCartExpanded(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1200);
    } else {
      addToast(result.error ?? 'Failed to create sale', 'error');
    }
    setSubmitting(false);
  }

  function getCartQuantity(productId: string): number {
    return cart.find((item) => item.product_id === productId)?.quantity ?? 0;
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(
    (p) => p.category === activeCategory
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-chai-200 border-t-chai-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-44">
      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-xl">
            <div className="rounded-full bg-green-100 p-4">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="mt-3 text-lg font-bold text-green-700">Sale Saved!</p>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="sticky top-14 z-20 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition-all',
                activeCategory === cat
                  ? 'bg-chai-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 md:grid-cols-3">
        {filteredProducts.map((product) => {
          const qty = getCartQuantity(product.id);
          return (
            <button
              key={product.id}
              onClick={() => handleAddItem(product)}
              className={cn(
                'relative flex min-h-[70px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all active:scale-95',
                qty > 0
                  ? 'border-chai-500 bg-chai-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-chai-300'
              )}
            >
              <span className="text-sm font-semibold text-gray-900">
                {product.name}
              </span>
              <span className="mt-0.5 text-xs font-medium text-chai-600">
                {formatCurrency(product.price_pence)}
              </span>
              {qty > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-chai-600 text-xs font-bold text-white shadow">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
        {filteredProducts.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-gray-400">
            No {activeCategory} available
          </p>
        )}
      </div>

      {/* Cart Detail (expandable) */}
      {cart.length > 0 && cartExpanded && (
        <div className="mx-4 mt-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Cart ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'})
            </h3>
            <button
              onClick={() => {
                setCart([]);
                setCartExpanded(false);
              }}
              className="text-xs font-medium text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.unit_price)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.product_id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product_id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-200"
                  >
                    +
                  </button>
                  <span className="ml-1 w-14 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 pb-2 pt-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        {/* Cart summary row */}
        <button
          onClick={() => cart.length > 0 && setCartExpanded((e) => !e)}
          className="mb-2 flex w-full items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-700">
            {cartItemCount > 0
              ? `${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`
              : 'No items'}
          </span>
          <span className="text-lg font-bold text-chai-700">
            {formatCurrency(cartTotal)}
          </span>
        </button>

        {/* Payment mode toggle */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMode('cash')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
              paymentMode === 'cash'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            )}
          >
            Cash
          </button>
          <button
            onClick={() => setPaymentMode('online')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
              paymentMode === 'online'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            )}
          >
            Online
          </button>
        </div>

        {/* Save Sale button */}
        <button
          onClick={handleSaveSale}
          disabled={cart.length === 0 || !paymentMode || submitting}
          className="w-full rounded-xl bg-chai-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-chai-700 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        >
          {submitting ? 'Saving...' : 'Save Sale'}
        </button>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
