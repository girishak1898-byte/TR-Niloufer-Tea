'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
      setLoadingUser(false);
    });
  }, []);

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

      {/* About */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">About</h2>
        <p className="text-sm text-gray-500">
          TR Hyderabad Tea Shop &mdash; Admin Portal v1.0.0
        </p>
        <p className="mt-1 text-sm text-gray-400">
          A progressive web app for tracking daily sales, managing workers, and generating reports.
        </p>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
