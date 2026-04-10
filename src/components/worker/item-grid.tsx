'use client';

import { cn, formatCurrency } from '@/lib/utils';
import type { Product, CartItem } from '@/lib/types';

interface ItemGridProps {
  products: Product[];
  onAddItem: (product: Product) => void;
  cartItems?: CartItem[];
}

export function ItemGrid({ products, onAddItem, cartItems = [] }: ItemGridProps) {
  // Group products by category
  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const cat = product.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  function getCartQuantity(productId: string): number {
    return cartItems.find((item) => item.product_id === productId)?.quantity ?? 0;
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-chai-700">
            {category}
          </h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {grouped[category].map((product) => {
              const qty = getCartQuantity(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => onAddItem(product)}
                  className={cn(
                    'relative flex min-h-[80px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all active:scale-95',
                    qty > 0
                      ? 'border-chai-500 bg-chai-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-chai-300 hover:bg-chai-50/50'
                  )}
                >
                  <span className="text-sm font-semibold text-gray-900">
                    {product.name}
                  </span>
                  <span className="mt-1 text-xs font-medium text-chai-600">
                    {formatCurrency(product.price_pence)}
                  </span>
                  {qty > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-chai-600 text-xs font-bold text-white">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
