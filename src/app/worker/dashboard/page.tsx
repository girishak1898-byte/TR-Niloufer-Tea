'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { ShiftSummaryCard } from '@/components/worker/shift-summary';
import { formatTime, formatCurrency } from '@/lib/utils';
import type { Shift, ShiftSummary } from '@/lib/types';
import {
  getWorkerSession,
  getActiveShift,
  startShift,
  endShift,
  getShiftSummary,
  logoutWorker,
} from '@/app/worker/actions';

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [workerName, setWorkerName] = useState('');
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('0');
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closingNote, setClosingNote] = useState('');

  const loadData = useCallback(async () => {
    const session = await getWorkerSession();
    if (!session) {
      router.push('/worker/login');
      return;
    }
    setWorkerName(session.worker_name);

    const shiftResult = await getActiveShift();
    if (shiftResult.success && shiftResult.data) {
      setShift(shiftResult.data);

      const summaryResult = await getShiftSummary(shiftResult.data.id);
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }
    } else {
      setShift(null);
      setSummary(null);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStartShift() {
    setActionLoading(true);
    const result = await startShift(Math.round((parseFloat(openingCash) || 0) * 100));
    if (result.success) {
      addToast('Shift started!', 'success');
      setShowStartShiftModal(false);
      setOpeningCash('0');
      await loadData();
    } else {
      addToast(result.error ?? 'Failed to start shift', 'error');
    }
    setActionLoading(false);
  }

  async function handleEndShift() {
    setActionLoading(true);
    const result = await endShift(Math.round((parseFloat(countedCash) || 0) * 100), closingNote);
    if (result.success) {
      addToast('Shift ended', 'success');
      setShowEndShiftModal(false);
      setCountedCash('');
      setClosingNote('');
      await loadData();
    } else {
      addToast(result.error ?? 'Failed to end shift', 'error');
    }
    setActionLoading(false);
  }

  async function handleLogout() {
    await logoutWorker();
    router.push('/worker/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-chai-200 border-t-chai-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Hello, {workerName}
        </h2>
      </div>

      {/* Shift Status */}
      {!shift ? (
        <div className="mb-6 rounded-xl border-2 border-dashed border-chai-300 bg-white p-8 text-center">
          <p className="mb-4 text-gray-600">
            No active shift. Start a shift to begin recording sales.
          </p>
          <Button
            size="xl"
            onClick={() => setShowStartShiftModal(true)}
            disabled={actionLoading}
            className="w-full"
          >
            Start Shift
          </Button>
        </div>
      ) : (
        <>
          {/* Active Shift Info */}
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-800">
                Shift Active
              </span>
            </div>
            <p className="mt-1 text-xs text-green-700">
              Started at {formatTime(shift.started_at)} &middot; Opening: {formatCurrency(shift.opening_cash ?? 0)}
            </p>
          </div>

          {/* Shift Summary */}
          {summary && (
            <div className="mb-6">
              <ShiftSummaryCard summary={summary} />
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Link
              href="/worker/sales/new"
              className="flex flex-col items-center justify-center rounded-xl bg-chai-600 px-4 py-5 text-center text-white shadow-sm transition-colors hover:bg-chai-700 active:bg-chai-800"
            >
              <svg
                className="mb-1 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span className="text-sm font-semibold">New Sale</span>
            </Link>
            <Link
              href="/worker/sales/history"
              className="flex flex-col items-center justify-center rounded-xl bg-white border border-gray-200 px-4 py-5 text-center text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <svg
                className="mb-1 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <span className="text-sm font-semibold">View History</span>
            </Link>
          </div>

          {/* Upload Shortcut */}
          <div className="mb-6">
            <Link
              href="/worker/upload"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-chai-300 bg-chai-50 px-4 py-4 text-center text-chai-700 transition-colors hover:bg-chai-100 active:bg-chai-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-semibold">Upload Bill / Receipt</span>
            </Link>
          </div>

          {/* End Shift */}
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              setCountedCash('');
              setClosingNote('');
              setShowEndShiftModal(true);
            }}
            className="w-full"
          >
            End Shift
          </Button>
        </>
      )}

      {/* Logout */}
      <div className="mt-6 text-center">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Start Shift Modal */}
      <Modal
        open={showStartShiftModal}
        onClose={() => setShowStartShiftModal(false)}
        title="Start Shift"
      >
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Opening Cash (£)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
          />
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowStartShiftModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleStartShift}
            disabled={actionLoading}
          >
            {actionLoading ? 'Starting...' : 'Start'}
          </Button>
        </div>
      </Modal>

      {/* End Shift Confirmation Modal */}
      <Modal
        open={showEndShiftModal}
        onClose={() => setShowEndShiftModal(false)}
        title="End Shift?"
      >
        <p className="mb-4 text-sm text-gray-600">
          Are you sure you want to end your current shift? You won&apos;t be able to
          record new sales until you start a new shift.
        </p>
        {summary && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">
              Shift Summary: {summary.total_sales} sales totalling{' '}
              {formatCurrency(summary.total_amount)}
            </p>
          </div>
        )}
        {(() => {
          const expectedCashPence = (summary?.cash_amount ?? 0) + (shift?.opening_cash ?? 0);
          const countedPence = Math.round((parseFloat(countedCash) || 0) * 100);
          const differencePence = countedPence - expectedCashPence;
          return (
            <div className="mb-4 space-y-3">
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-gray-600">
                  Expected Cash: <span className="font-semibold text-gray-900">{formatCurrency(expectedCashPence)}</span>
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Counted Cash (£)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
                  placeholder="0"
                />
              </div>
              {countedCash !== '' && (
                <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: differencePence === 0 ? '#f0fdf4' : '#fef2f2' }}>
                  <p style={{ color: differencePence === 0 ? '#15803d' : '#b91c1c' }} className="font-semibold">
                    Difference: {formatCurrency(differencePence)}
                    {differencePence === 0 ? ' (Match)' : differencePence > 0 ? ' (Over)' : ' (Short)'}
                  </p>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Closing Note (optional)
                </label>
                <textarea
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
                  rows={2}
                  placeholder="Any notes about this shift..."
                />
              </div>
            </div>
          );
        })()}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowEndShiftModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleEndShift}
            disabled={actionLoading}
          >
            {actionLoading ? 'Ending...' : 'End Shift'}
          </Button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
