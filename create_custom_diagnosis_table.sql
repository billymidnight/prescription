-- =============================================
-- CREATE TABLE FOR DIAGNOSIS DROPDOWN
-- Copy and paste this script into Supabase SQL Editor
-- =============================================

-- Create custom_diagnosis table
CREATE TABLE IF NOT EXISTS custom_diagnosis (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default values
INSERT INTO custom_diagnosis (diagnosis_value) VALUES
  ('Acne vulgaris'),
  ('Melasma'),
  ('Atopic dermatitis'),
  ('Psoriasis'),
  ('Androgenic alopecia'),
  ('Seborrheic dermatitis'),
  ('Tinea corporis'),
  ('Vitiligo'),
  ('Post-inflammatory hyperpigmentation'),
  ('Xerosis cutis')
ON CONFLICT (diagnosis_value) DO NOTHING;

-- Verify insert
SELECT 'Diagnosis' as table_name, COUNT(*) as count FROM custom_diagnosis;
