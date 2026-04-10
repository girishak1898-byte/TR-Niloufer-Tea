'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getAdminDashboardStats, getActiveShifts, getRecentSales, getInventoryDashboardStats } from '@/app/admin/actions';
import type { SaleWithItems, InventoryItem, InventoryMovementWithItem } from '@/lib/types';

interface DashboardStats {
  total_sales: number;
  total_revenue: number;
  cash_total: number;
  online_total: number;
  active_workers: number;
  items_sold: number;
  top_items: { name: string; quantity: number }[];
  worker_performance: { name: string; sales: number; revenue: number }[];
}

interface ActiveShift {
  id: string;
  worker_id: string;
  worker_name: string;
  started_at: string;
  status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [recentSales, setRecentSales] = useState<SaleWithItems[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [outOfStock, setOutOfStock] = useState<InventoryItem[]>([]);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);
  const [recentMovements, setRecentMovements] = useState<InventoryMovementWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [statsResult, shiftsResult, salesResult, invResult] = await Promise.all([
      getAdminDashboardStats(),
      getActiveShifts(),
      getRecentSales(10),
      getInventoryDashboardStats(),
    ]);

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    if (shiftsResult.success) {
      setActiveShifts(shiftsResult.data);
    }
    if (salesResult.success) {
      setRecentSales(salesResult.data);
    }
    if (invResult.success && invResult.data) {
      setLowStock(invResult.data.low_stock);
      setOutOfStock(invResult.data.out_of_stock);
      setPendingProofsCount(invResult.data.pending_proofs_count);
      setRecentMovements(invResult.data.recent_movements);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Auto-refreshes every 30s
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title="Today Total"
          value={formatCurrency(stats?.total_revenue ?? 0)}
          subtitle={`${stats?.items_sold ?? 0} items sold`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Cash Total"
          value={formatCurrency(stats?.cash_total ?? 0)}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Online Total"
          value={formatCurrency(stats?.online_total ?? 0)}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Orders Today"
          value={String(stats?.total_sales ?? 0)}
          subtitle={`${stats?.active_workers ?? 0} active employees`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Main Content: 2-column on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Recent Sales (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Sales</h2>
            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-500">No sales recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 pr-3 font-medium">Time</th>
                      <th className="pb-3 pr-3 font-medium">Employee</th>
                      <th className="hidden pb-3 pr-3 font-medium sm:table-cell">Items</th>
                      <th className="pb-3 pr-3 font-medium">Payment</th>
                      <th className="pb-3 pr-3 text-right font-medium">Total</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className={sale.status === 'voided' ? 'text-gray-400' : ''}>
                        <td className="whitespace-nowrap py-2.5 pr-3">{formatDateTime(sale.created_at)}</td>
                        <td className="py-2.5 pr-3">{sale.worker_name_snapshot}</td>
                        <td className="hidden max-w-[200px] truncate py-2.5 pr-3 sm:table-cell" title={sale.items.map((i) => `${i.product_name_snapshot} x${i.quantity}`).join(', ')}>
                          {sale.items.map((i) => `${i.product_name_snapshot} x${i.quantity}`).join(', ')}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            sale.payment_mode === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sale.payment_mode}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            sale.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Sidebar widgets (1/3 width) */}
        <div className="space-y-6">
          {/* Top Selling Items */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Selling Items</h2>
            {stats?.top_items && stats.top_items.length > 0 ? (
              <div className="space-y-2">
                {stats.top_items.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chai-100 text-xs font-bold text-chai-700">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-600">{item.quantity} sold</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No items sold today</p>
            )}
          </div>

          {/* Employee Performance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Employee Performance</h2>
            {stats?.worker_performance && stats.worker_performance.length > 0 ? (
              <div className="space-y-3">
                {stats.worker_performance.map((w) => (
                  <div key={w.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{w.name}</p>
                      <p className="text-xs text-gray-500">{w.sales} sales</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(w.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No employee data yet</p>
            )}
          </div>

          {/* Active Shifts */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Shifts</h2>
            {activeShifts.length === 0 ? (
              <p className="text-sm text-gray-500">No employees currently on shift</p>
            ) : (
              <div className="space-y-3">
                {activeShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                        {shift.worker_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{shift.worker_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-500">
                        since {new Date(shift.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          {(outOfStock.length > 0 || lowStock.length > 0) && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Stock Alerts</h2>
              <div className="space-y-2">
                {outOfStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2.5">
                    <span className="font-medium text-red-800">{item.name}</span>
                    <span className="text-xs font-semibold text-red-600">OUT OF STOCK</span>
                  </div>
                ))}
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2.5">
                    <span className="font-medium text-amber-800">{item.name}</span>
                    <span className="text-xs font-semibold text-amber-600">{Number(item.current_stock)} {item.unit} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Proofs */}
          {pendingProofsCount > 0 && (
            <a href="/admin/proofs" className="block rounded-xl border border-amber-200 bg-amber-50 p-6 transition-colors hover:bg-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-amber-900">Pending Proofs</h2>
                  <p className="text-sm text-amber-700">{pendingProofsCount} upload{pendingProofsCount !== 1 ? 's' : ''} awaiting review</p>
                </div>
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          )}

          {/* Recent Movements */}
          {recentMovements.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Stock Movements</h2>
              <div className="space-y-2">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.item_name}</p>
                      <p className="text-xs text-gray-500">{m.movement_type}</p>
                    </div>
                    <span className={`text-sm font-semibold ${Number(m.quantity) > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-1 truncate text-lg font-bold text-gray-900 sm:text-2xl">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`hidden rounded-lg p-2.5 sm:block ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
