'use server';

import { createServiceClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function getPublicInventoryItemNames() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return { success: true, data: (data ?? []) as { id: string; name: string }[] };
  } catch {
    return { success: false, data: [] };
  }
}

export async function uploadProof(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const submittedName = (formData.get('submitted_name') as string)?.trim() || null;
    const itemName = (formData.get('item_name') as string)?.trim() || null;
    const supplierName = (formData.get('supplier_name') as string)?.trim() || null;
    const uploaderNote = (formData.get('uploader_note') as string)?.trim() || null;
    const quantityStr = (formData.get('quantity') as string)?.trim() || null;
    const amountStr = (formData.get('amount') as string)?.trim() || null;

    const quantity = quantityStr ? parseFloat(quantityStr) : null;
    const amountPence = amountStr ? Math.round(parseFloat(amountStr) * 100) : null;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!itemName) {
      return { success: false, error: 'Item name is required' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: 'File type not allowed. Use JPG, PNG, WebP, or PDF.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File too large. Maximum 10MB.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let processedBuffer: Buffer;
    let finalMimeType = file.type;
    let ext: string;

    if (file.type.startsWith('image/')) {
      // Optimize image: resize to max 1200x1600, JPEG quality 80
      processedBuffer = await sharp(buffer)
        .resize({
          width: 1200,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      finalMimeType = 'image/jpeg';
      ext = 'jpg';
    } else {
      // PDF: upload as-is
      processedBuffer = buffer;
      ext = 'pdf';
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uniqueId = crypto.randomUUID();
    const storagePath = `proofs/${year}/${month}/${uniqueId}.${ext}`;

    const supabase = createServiceClient();

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('proof-uploads')
      .upload(storagePath, processedBuffer, {
        contentType: finalMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Insert proof record
    const { error: dbError } = await supabase
      .from('proof_uploads')
      .insert({
        storage_path: storagePath,
        original_filename: file.name,
        file_size_bytes: processedBuffer.length,
        mime_type: finalMimeType,
        submitted_name: submittedName,
        item_name: itemName,
        supplier_name: supplierName,
        uploader_note: uploaderNote,
        quantity,
        amount_pence: amountPence,
        status: 'pending',
      });

    if (dbError) {
      console.error('DB insert error:', dbError);
      return { success: false, error: 'Failed to save upload record' };
    }

    return { success: true };
  } catch (err) {
    console.error('Upload error:', err);
    return { success: false, error: 'Upload failed. Please try again.' };
  }
}
