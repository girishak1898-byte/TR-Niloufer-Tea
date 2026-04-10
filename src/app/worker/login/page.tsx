'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PinInput } from '@/components/ui/pin-input';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import { getWorkers, loginWorker } from '@/app/worker/actions';

interface WorkerOption {
  id: string;
  name: string;
}

export default function WorkerLoginPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    async function load() {
      const result = await getWorkers();
      if (result.success) {
        setWorkers(result.data);
      } else {
        addToast(result.error ?? 'Failed to load workers', 'error');
      }
      setLoading(false);
    }
    load();
  }, [addToast]);

  async function handlePinComplete(pin: string) {
    if (!selectedWorker || submitting) return;
    setSubmitting(true);
    setPinError('');

    const result = await loginWorker(selectedWorker.id, pin);
    if (result.success) {
      router.push('/worker/dashboard');
    } else {
      setPinError(result.error ?? 'Login failed');
      setSubmitting(false);
    }
  }

  function handleBack() {
    setSelectedWorker(null);
    setPinError('');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-chai-200 border-t-chai-600" />
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {!selectedWorker ? (
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo size="lg" className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-chai-800">TR Hyderabad Tea Shop</h2>
            <p className="mt-1 text-sm text-gray-500">Select your name to log in</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {workers.map((worker) => (
              <button
                key={worker.id}
                onClick={() => setSelectedWorker(worker)}
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-5 text-center text-lg font-semibold text-gray-900 shadow-sm transition-all hover:border-chai-400 hover:bg-chai-50 active:scale-95"
              >
                {worker.name}
              </button>
            ))}
          </div>

          {workers.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              No workers found. Ask admin to add workers.
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-chai-800">
              Hi, {selectedWorker.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Enter your 4-digit PIN</p>
          </div>

          <PinInput
            onComplete={handlePinComplete}
            error={pinError}
            disabled={submitting}
          />

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={handleBack} disabled={submitting}>
              Back to worker selection
            </Button>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
