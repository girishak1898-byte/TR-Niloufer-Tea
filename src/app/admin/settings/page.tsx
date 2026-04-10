'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { getAdminRole, getAdminProfiles, createAdminUser, updateAdminRole } from '@/app/admin/actions';
import type { AdminProfile, AdminRole } from '@/lib/types';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setEmail(user.email);
    setLoadingUser(false);

    const roleResult = await getAdminRole();
    if (roleResult.success) setCurrentRole(roleResult.role);

    if (roleResult.role === 'superadmin') {
      const adminsResult = await getAdminProfiles();
      if (adminsResult.success) setAdmins(adminsResult.data);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleResetPassword() {
    if (!email) {
      addToast('No email found for current user', 'error');
      return;
    }

    setResettingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/settings`,
    });
    setResettingPassword(false);

    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast('Password reset email sent. Check your inbox.', 'success');
    }
  }

  async function handleRoleChange(profileId: string, newRole: AdminRole) {
    const result = await updateAdminRole(profileId, newRole);
    if (result.success) {
      addToast('Role updated', 'success');
      loadData();
    } else {
      addToast(result.error ?? 'Failed', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Shop Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Shop Information</h2>
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Shop Name</label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="text-gray-700">TR Hyderabad Tea Shop</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Currency</label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="text-gray-700">GBP (British Pounds)</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">All prices are stored in pence and displayed as pounds.</p>
          </div>
        </div>
      </div>

      {/* Admin Profile */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Admin Profile</h2>
        <div className="max-w-md space-y-4">
          {loadingUser ? (
            <p className="text-sm text-gray-500">Loading profile...</p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                  <svg
                    className="mr-2 h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-gray-700">{email || 'Not available'}</span>
                </div>
              </div>
              {currentRole && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
                  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      currentRole === 'superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {currentRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <p className="mb-2 text-sm text-gray-500">
                  Click below to receive a password reset email.
                </p>
                <Button
                  variant="secondary"
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                >
                  {resettingPassword ? 'Sending...' : 'Change Password'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Admin Users Management (superadmin only) */}
      {currentRole === 'superadmin' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
            <Button size="sm" onClick={() => setShowAddAdminModal(true)}>
              Add Admin
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-3 font-medium">Email</th>
                  <th className="pb-3 pr-3 font-medium">Name</th>
                  <th className="pb-3 pr-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="py-3 pr-3 text-gray-900">{admin.email}</td>
                    <td className="py-3 pr-3 text-gray-600">{admin.display_name ?? '-'}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        admin.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-3">
                      {admin.email !== email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoleChange(admin.id, admin.role === 'superadmin' ? 'admin' : 'superadmin')}
                        >
                          {admin.role === 'superadmin' ? 'Demote' : 'Promote'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* About */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">About</h2>
        <p className="text-sm text-gray-500">
          TR Hyderabad Tea Shop &mdash; Admin Portal v1.1.0
        </p>
        <p className="mt-1 text-sm text-gray-400">
          A progressive web app for tracking daily sales, managing employees, and generating reports.
        </p>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <AddAdminModal
          onClose={() => setShowAddAdminModal(false)}
          onSuccess={() => {
            setShowAddAdminModal(false);
            addToast('Admin user created', 'success');
            loadData();
          }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function AddAdminModal({ onClose, onSuccess, onError }: {
  onClose: () => void; onSuccess: () => void; onError: (err: string) => void;
}) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<AdminRole>('admin');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createAdminUser(adminEmail, adminPassword, adminRole, adminName);
    setSaving(false);
    if (result.success) onSuccess();
    else onError(result.error ?? 'Failed');
  }

  return (
    <Modal open onClose={onClose} title="Add Admin User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="admin-email"
          label="Email"
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="partner@example.com"
          required
        />
        <Input
          id="admin-password"
          label="Password"
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Min 6 characters"
          minLength={6}
          required
        />
        <Input
          id="admin-name"
          label="Display Name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="e.g. Partner"
        />
        <div>
          <label htmlFor="admin-role" className="mb-1 block text-sm font-medium text-gray-700">Role</label>
          <select
            id="admin-role"
            value={adminRole}
            onChange={(e) => setAdminRole(e.target.value as AdminRole)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Admin'}</Button>
        </div>
      </form>
    </Modal>
  );
}
