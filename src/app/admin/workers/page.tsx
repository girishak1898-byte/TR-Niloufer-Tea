'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { getWorkers, createWorker, updateWorker } from '@/app/admin/actions';

interface WorkerRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmployeesPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerRow | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchWorkers = useCallback(async () => {
    const result = await getWorkers();
    if (result.success) {
      setWorkers(result.data as WorkerRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  async function handleToggleActive(worker: WorkerRow) {
    const result = await updateWorker(worker.id, { is_active: !worker.is_active });
    if (result.success) {
      addToast(
        `${worker.name} ${!worker.is_active ? 'activated' : 'deactivated'}`,
        'success'
      );
      fetchWorkers();
    } else {
      addToast(result.error ?? 'Failed to update employee', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <Button onClick={() => setShowAddModal(true)}>Add Employee</Button>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No employees found. Add your first employee to get started.
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{worker.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          worker.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {worker.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDateTime(worker.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingWorker(worker)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={worker.is_active ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleActive(worker)}
                        >
                          {worker.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Add Employee Modal */}
      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          addToast('Employee created successfully', 'success');
          fetchWorkers();
        }}
        onError={(err) => addToast(err, 'error')}
      />

      {/* Edit Employee Modal */}
      {editingWorker && (
        <EditEmployeeModal
          open={!!editingWorker}
          worker={editingWorker}
          onClose={() => setEditingWorker(null)}
          onSuccess={() => {
            setEditingWorker(null);
            addToast('Employee updated successfully', 'success');
            fetchWorkers();
          }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function AddEmployeeModal({
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
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createWorker(name, pin);
    setSaving(false);

    if (result.success) {
      setName('');
      setPin('');
      onSuccess();
    } else {
      onError(result.error ?? 'Failed to create employee');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Employee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="worker-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter employee name"
          required
        />
        <Input
          id="worker-pin"
          label="PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="4-digit PIN"
          minLength={4}
          maxLength={8}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditEmployeeModal({
  open,
  worker,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  worker: WorkerRow;
  onClose: () => void;
  onSuccess: () => void;
  onError: (err: string) => void;
}) {
  const [name, setName] = useState(worker.name);
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(worker.is_active);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const data: { name?: string; pin?: string; is_active?: boolean } = {};
    if (name !== worker.name) data.name = name;
    if (pin) data.pin = pin;
    if (isActive !== worker.is_active) data.is_active = isActive;

    const result = await updateWorker(worker.id, data);
    setSaving(false);

    if (result.success) {
      onSuccess();
    } else {
      onError(result.error ?? 'Failed to update employee');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Employee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="edit-worker-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="edit-worker-pin"
          label="New PIN (leave blank to keep current)"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Leave blank to keep current"
          minLength={4}
          maxLength={8}
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
