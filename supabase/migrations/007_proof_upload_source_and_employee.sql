-- Add source tracking and employee linking to proof_uploads
ALTER TABLE proof_uploads ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES workers(id);
ALTER TABLE proof_uploads ADD COLUMN IF NOT EXISTS upload_source text NOT NULL DEFAULT 'public' CHECK (upload_source IN ('public', 'employee_portal'));
ALTER TABLE proof_uploads ADD COLUMN IF NOT EXISTS linked_inventory_item_id uuid REFERENCES inventory_items(id);

-- Index for employee lookups
CREATE INDEX IF NOT EXISTS idx_proof_uploads_employee_id ON proof_uploads(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proof_uploads_upload_source ON proof_uploads(upload_source);
