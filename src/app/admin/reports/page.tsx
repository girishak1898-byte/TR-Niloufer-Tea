'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getReportData, exportSalesCSV } from '@/app/admin/actions';

interface ReportData {
  daily_summaries: {
    date: string;
    total_sales: number;
    total_amount: number;
    cash_amount: number;
    online_amount: number;
  }[];
  worker_totals: {
    worker_id: string;
    worker_name: string;
    total_sales: number;
    total_revenue: number;
  }[];
  product_totals: {
    product_id: string;
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
  }[];
  payment_breakdown: {
    cash: { count: number; total: number };
    online: { count: number; total: number };
  };
  total_sales: number;
  total_revenue: number;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  async function handleGenerate() {
    if (!startDate || !endDate) {
      addToast('Please select both start and end dates', 'error');
      return;
    }
    if (startDate > endDate) {
      addToast('Start date must be before end date', 'error');
      return;
    }

    setLoading(true);
    const result = await getReportData(startDate, endDate);
    setLoading(false);

    if (result.success && result.data) {
      setReport(result.data);
    } else {
      addToast(result.error ?? 'Failed to generate report', 'error');
    }
  }

  async function handleExportCSV() {
    if (!startDate || !endDate) {
      addToast('Please select dates first', 'error');
      return;
    }

    setExporting(true);
    const result = await exportSalesCSV(startDate, endDate);
    setExporting(false);

    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('CSV exported successfully', 'success');
    } else {
      addToast(result.error ?? 'Failed to export CSV', 'error');
    }
  }

  const avgSaleValue =
    report && report.total_sales > 0
      ? report.total_revenue / report.total_sales
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Date Range Picker */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            id="report-start-date"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-44"
          />
          <Input
            id="report-end-date"
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {report && (
            <Button variant="secondary" onClick={handleExportCSV} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>

      {/* Report Content */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Total Sales" value={String(report.total_sales)} />
            <SummaryCard title="Total Revenue" value={formatCurrency(report.total_revenue)} />
            <SummaryCard title="Avg Sale Value" value={formatCurrency(avgSaleValue)} />
            <SummaryCard
              title="Cash / Online"
              value={`${formatCurrency(report.payment_breakdown.cash.total)} / ${formatCurrency(report.payment_breakdown.online.total)}`}
              subtitle={`${report.payment_breakdown.cash.count} cash, ${report.payment_breakdown.online.count} online`}
            />
          </div>

          {/* Daily Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Daily Breakdown</h2>
            {report.daily_summaries.length === 0 ? (
              <p className="text-sm text-gray-500">No data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Sales</th>
                      <th className="pb-3 text-right font-medium">Total</th>
                      <th className="pb-3 text-right font-medium">Cash</th>
                      <th className="pb-3 text-right font-medium">Online</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.daily_summaries.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-2.5">{day.total_sales}</td>
                        <td className="py-2.5 text-right font-medium">
                          {formatCurrency(day.total_amount)}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          {formatCurrency(day.cash_amount)}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          {formatCurrency(day.online_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="pt-3">Total</td>
                      <td className="pt-3">{report.total_sales}</td>
                      <td className="pt-3 text-right">{formatCurrency(report.total_revenue)}</td>
                      <td className="pt-3 text-right text-gray-600">
                        {formatCurrency(report.payment_breakdown.cash.total)}
                      </td>
                      <td className="pt-3 text-right text-gray-600">
                        {formatCurrency(report.payment_breakdown.online.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Employee Performance & Top Products side by side */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Employee Performance */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Employee Performance</h2>
              {report.worker_totals.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 font-medium">Employee</th>
                        <th className="pb-3 font-medium">Sales</th>
                        <th className="pb-3 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.worker_totals.map((w) => (
                        <tr key={w.worker_id} className="hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-900">{w.worker_name}</td>
                          <td className="py-2.5">{w.total_sales}</td>
                          <td className="py-2.5 text-right font-medium">
                            {formatCurrency(w.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Products</h2>
              {report.product_totals.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 font-medium">Product</th>
                        <th className="pb-3 font-medium">Qty Sold</th>
                        <th className="pb-3 text-right font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.product_totals.map((p) => (
                        <tr key={p.product_id} className="hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-900">{p.product_name}</td>
                          <td className="py-2.5">{p.quantity_sold}</td>
                          <td className="py-2.5 text-right font-medium">
                            {formatCurrency(p.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <p className="text-gray-400">Select a date range and click &quot;Generate Report&quot; to view data</p>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
