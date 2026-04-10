'use client';

import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClear: () => void;
}

export function Cart({ items, onUpdateQuantity, onClear }: CartProps) {
  const total = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-400">
        Tap items above to add to cart
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h3>
        <button
          onClick={onClear}
          className="text-xs font-medium text-red-500 hover:text-red-700"
        >
          Clear
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
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
                onClick={() => onUpdateQuantity(item.product_id, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                -
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.product_id, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                +
              </button>
              <span className="ml-1 w-16 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(item.unit_price * item.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2.5">
        <span className="text-sm font-bold text-gray-900">Total</span>
        <span className="text-lg font-bold text-chai-700">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
