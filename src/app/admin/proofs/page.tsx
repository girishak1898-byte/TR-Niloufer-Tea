'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { getProofs, getProofSignedUrl, reviewProof, linkProofToMovement, getInventoryMovements } from '@/app/admin/actions';
import type { ProofUpload, ProofStatus, InventoryMovementWithItem } from '@/lib/types';

const STATUS_COLORS: Record<ProofStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ProofsPage() {
  const [proofs, setProofs] = useState<ProofUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProofStatus | 'all'>('pending');
  const [previewProof, setPreviewProof] = useState<ProofUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkingProof, setLinkingProof] = useState<ProofUpload | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchProofs = useCallback(async () => {
    const result = await getProofs(
      statusFilter === 'all' ? {} : { status: statusFilter }
    );
    if (result.success) setProofs(result.data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { setLoading(true); fetchProofs(); }, [fetchProofs]);

  async function handlePreview(proof: ProofUpload) {
    setPreviewProof(proof);
    setPreviewUrl(null);
    const result = await getProofSignedUrl(proof.storage_path);
    if (result.success && result.url) {
      setPreviewUrl(result.url);
    }
  }

  async function handleReview(proofId: string, action: 'approved' | 'rejected') {
    const result = await reviewProof(proofId, action);
    if (result.success) {
      addToast(`Proof ${action}`, 'success');
      setPreviewProof(null);
      fetchProofs();
    } else {
      addToast(result.error ?? 'Failed', 'error');
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="text-gray-500">Loading proofs...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proof Uploads</h1>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Proofs List */}
      {proofs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No {statusFilter === 'all' ? '' : statusFilter} proofs found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{proof.item_name ?? proof.original_filename}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(proof.created_at)}</p>
                </div>
                <span className={`ml-2 inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[proof.status as ProofStatus]}`}>
                  {proof.status}
                </span>
              </div>

              {proof.submitted_name && (
                <p className="text-sm text-gray-600">By: {proof.submitted_name}</p>
              )}
              {proof.supplier_name && (
                <p className="text-sm text-gray-600">Supplier: {proof.supplier_name}</p>
              )}
              {proof.uploader_note && (
                <p className="mt-1 text-sm text-gray-500">{proof.uploader_note}</p>
              )}

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handlePreview(proof)}>
                  View
                </Button>
                {proof.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleReview(proof.id, 'approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReview(proof.id, 'rejected')}>
                      Reject
                    </Button>
                  </>
                )}
                {proof.status === 'approved' && !proof.linked_movement_id && (
                  <Button size="sm" variant="secondary" onClick={() => setLinkingProof(proof)}>
                    Link
                  </Button>
                )}
              </div>

              {proof.reviewed_by && (
                <p className="mt-2 text-xs text-gray-400">
                  Reviewed by {proof.reviewed_by}
                  {proof.review_note ? `: ${proof.review_note}` : ''}
                </p>
              )}
              {proof.linked_movement_id && (
                <p className="mt-1 text-xs text-green-600">Linked to movement</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewProof && (
        <Modal open={!!previewProof} onClose={() => setPreviewProof(null)} title={previewProof.item_name ?? previewProof.original_filename}>
          <div className="space-y-4">
            {previewUrl ? (
              previewProof.mime_type === 'application/pdf' ? (
                <div className="text-center">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Open PDF in new tab
                  </a>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Proof" className="mx-auto max-h-[500px] rounded-lg" />
              )
            ) : (
              <div className="flex h-48 items-center justify-center text-gray-400">Loading preview...</div>
            )}

            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>File:</strong> {previewProof.original_filename}</p>
              <p><strong>Size:</strong> {(previewProof.file_size_bytes / 1024).toFixed(0)} KB</p>
              {previewProof.submitted_name && <p><strong>Submitted by:</strong> {previewProof.submitted_name}</p>}
              {previewProof.supplier_name && <p><strong>Supplier:</strong> {previewProof.supplier_name}</p>}
              {previewProof.uploader_note && <p><strong>Note:</strong> {previewProof.uploader_note}</p>}
            </div>

            {previewProof.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => { handleReview(previewProof.id, 'rejected'); }}>Reject</Button>
                <Button onClick={() => { handleReview(previewProof.id, 'approved'); }}>Approve</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Link to Movement Modal */}
      {linkingProof && (
        <LinkMovementModal
          proof={linkingProof}
          onClose={() => setLinkingProof(null)}
          onSuccess={() => { setLinkingProof(null); addToast('Linked successfully', 'success'); fetchProofs(); }}
          onError={(err) => addToast(err, 'error')}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function LinkMovementModal({ proof, onClose, onSuccess, onError }: {
  proof: ProofUpload; onClose: () => void; onSuccess: () => void; onError: (err: string) => void;
}) {
  const [movements, setMovements] = useState<InventoryMovementWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getInventoryMovements({ limit: 20 }).then((result) => {
      if (result.success) setMovements(result.data.filter((m) => !m.proof_upload_id));
      setLoading(false);
    });
  }, []);

  async function handleLink() {
    if (!selectedId) { onError('Select a movement'); return; }
    setSaving(true);
    const result = await linkProofToMovement(proof.id, selectedId);
    setSaving(false);
    if (result.success) onSuccess();
    else onError(result.error ?? 'Failed');
  }

  return (
    <Modal open onClose={onClose} title="Link Proof to Movement">
      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading movements...</div>
      ) : movements.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No unlinked movements available.</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="link-movement" className="mb-1 block text-sm font-medium text-gray-700">Select Movement</label>
            <select
              id="link-movement"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-chai-500 focus:outline-none focus:ring-1 focus:ring-chai-500"
            >
              <option value="">Select...</option>
              {movements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.item_name} - {m.movement_type} ({Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity)}) - {formatDateTime(m.created_at)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleLink} disabled={saving}>{saving ? 'Linking...' : 'Link'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
