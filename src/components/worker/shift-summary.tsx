'use client';

import { formatCurrency } from '@/lib/utils';
import type { ShiftSummary } from '@/lib/types';

interface ShiftSummaryProps {
  summary: ShiftSummary;
}

export function ShiftSummaryCard({ summary }: ShiftSummaryProps) {
  return (
    <div className="space-y-3">
      {/* Total */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Total Sales
        </p>
        <p className="mt-1 text-2xl font-bold text-chai-700">
          {formatCurrency(summary.total_amount)}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {summary.total_sales} {summary.total_sales === 1 ? 'sale' : 'sales'} &middot;{' '}
          {summary.items_sold} {summary.items_sold === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Cash vs Online */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Cash
            </p>
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {formatCurrency(summary.cash_amount)}
          </p>
          <p className="text-xs text-gray-500">
            {summary.cash_count} {summary.cash_count === 1 ? 'sale' : 'sales'}
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <svg
                className="h-4 w-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Online
            </p>
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {formatCurrency(summary.online_amount)}
          </p>
          <p className="text-xs text-gray-500">
            {summary.online_count} {summary.online_count === 1 ? 'sale' : 'sales'}
          </p>
        </div>
      </div>
    </div>
  );
}
