'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { uploadProof } from './actions';

const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf';
const MAX_SIZE_MB = 10;

export default function UploadPage() {
  const [submittedName, setSubmittedName] = useState('');
  const [itemName, setItemName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [uploaderNote, setUploaderNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum ${MAX_SIZE_MB}MB.`);
      setFile(null);
      return;
    }
    setError('');
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('submitted_name', submittedName);
    formData.append('item_name', itemName);
    formData.append('supplier_name', supplierName);
    formData.append('uploader_note', uploaderNote);

    const result = await uploadProof(formData);
    setUploading(false);

    if (result.success) {
      setSuccess(true);
      setSubmittedName('');
      setItemName('');
      setSupplierName('');
      setUploaderNote('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } else {
      setError(result.error ?? 'Upload failed');
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Upload Submitted</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your bill/receipt has been submitted for review. Thank you!
            </p>
            <Button
              className="mt-6"
              onClick={() => setSuccess(false)}
            >
              Submit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex justify-center">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">TR Hyderabad Tea Shop</h1>
            <p className="mt-1 text-sm text-gray-500">Upload Bill / Receipt</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="submitted-name"
              label="Your Name"
              value={submittedName}
              onChange={(e) => setSubmittedName(e.target.value)}
              placeholder="e.g. Girish"
            />

            <Input
              id="item-name"
              label="Item Name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Tea Powder, Sugar"
              required
            />

            <Input
              id="supplier-name"
              label="Supplier / Shop Name (optional)"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Metro Cash & Carry"
            />

            <div>
              <label htmlFor="uploader-note" className="mb-1 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                id="uploader-note"
                value={uploaderNote}
                onChange={(e) => setUploaderNote(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
              />
            </div>

            <div>
              <label htmlFor="proof-file" className="mb-1 block text-sm font-medium text-gray-700">
                Bill / Receipt Image or PDF
              </label>
              <input
                ref={fileRef}
                id="proof-file"
                type="file"
                accept={ALLOWED_EXTENSIONS}
                onChange={handleFileChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-chai-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-chai-700 focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, WebP, or PDF. Max {MAX_SIZE_MB}MB.
              </p>
            </div>

            {file && (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-chai-600 hover:bg-chai-700 active:bg-chai-800"
              size="lg"
            >
              {uploading ? 'Uploading...' : 'Submit'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
