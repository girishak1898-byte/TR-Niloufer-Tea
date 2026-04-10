-- Admin profiles with roles
CREATE TABLE admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Seed owner as superadmin
INSERT INTO admin_profiles (user_id, role, display_name)
SELECT id, 'superadmin', 'Owner'
FROM auth.users
WHERE email = 'girishak1898@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Add quantity and amount fields to proof_uploads for enhanced upload form
ALTER TABLE proof_uploads ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE proof_uploads ADD COLUMN IF NOT EXISTS amount_pence integer;

-- Update trigger for admin_profiles
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
