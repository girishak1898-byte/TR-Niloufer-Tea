'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { uploadProof, getPublicInventoryItemNames } from './actions';

const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

export default function UploadPage() {
  const [submittedName, setSubmittedName] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string }[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [uploaderNote, setUploaderNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPublicInventoryItemNames().then((result) => {
      if (result.success) setInventoryItems(result.data);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = inventoryItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const effectiveItemName = showManualInput ? manualItemName : selectedItemName;

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum ${MAX_SIZE_MB}MB.`);
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('File type not allowed. Use JPG, PNG, WebP, or PDF.');
      setFile(null);
      return;
    }
    setError('');
    setFile(selected);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileSelect(e.target.files?.[0] ?? null);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!effectiveItemName) {
      setError('Please select or enter an item name');
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('submitted_name', submittedName);
    formData.append('item_name', effectiveItemName);
    formData.append('supplier_name', supplierName);
    formData.append('uploader_note', uploaderNote);
    if (quantity) formData.append('quantity', quantity);
    if (amount) formData.append('amount', amount);

    const result = await uploadProof(formData);
    setUploading(false);

    if (result.success) {
      setSuccess(true);
      setSubmittedName('');
      setSelectedItemName('');
      setManualItemName('');
      setSearchQuery('');
      setShowManualInput(false);
      setSupplierName('');
      setQuantity('');
      setAmount('');
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
            {/* Your Name */}
            <Input
              id="submitted-name"
              label="Your Name"
              value={submittedName}
              onChange={(e) => setSubmittedName(e.target.value)}
              placeholder="e.g. Girish"
              required
            />

            {/* Item Selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Choose Item <span className="text-red-500">*</span>
              </label>

              {!showManualInput ? (
                <div ref={dropdownRef} className="relative">
                  <input
                    type="text"
                    value={selectedItemName || searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedItemName('');
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search inventory items..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
                  />
                  {showDropdown && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No items found</div>
                      ) : (
                        filteredItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedItemName(item.name);
                              setSearchQuery('');
                              setShowDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-chai-50"
                          >
                            {item.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  id="manual-item-name"
                  value={manualItemName}
                  onChange={(e) => setManualItemName(e.target.value)}
                  placeholder="Type item name manually"
                  required
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setShowManualInput(!showManualInput);
                  if (showManualInput) {
                    setManualItemName('');
                  } else {
                    setSelectedItemName('');
                    setSearchQuery('');
                  }
                }}
                className="mt-1.5 text-xs font-medium text-chai-600 hover:text-chai-700"
              >
                {showManualInput ? 'Choose from inventory list' : 'Item not listed? Enter manually'}
              </button>
            </div>

            {/* Supplier / Shop Name */}
            <Input
              id="supplier-name"
              label="Supplier / Shop Name (optional)"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Metro Cash & Carry"
            />

            {/* Quantity and Amount side by side */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="quantity"
                label="Quantity (optional)"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 5"
              />
              <Input
                id="amount"
                label="Amount £ (optional)"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25.50"
              />
            </div>

            {/* Notes */}
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

            {/* Drag & Drop Upload Area */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bill / Receipt <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-chai-500 bg-chai-50'
                    : file
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-chai-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-1">
                    <svg className="mx-auto h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">
                      Drag & drop your file here, or <span className="text-chai-600">browse</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG, WebP, or PDF &middot; Max {MAX_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-chai-600 hover:bg-chai-700 active:bg-chai-800"
              size="lg"
            >
              {uploading ? 'Uploading...' : 'Submit Bill / Receipt'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
