-- =============================================
-- CREATE TABLE FOR PROCEDURES DROPDOWN
-- Copy and paste this script into Supabase SQL Editor
-- =============================================

-- Create custom_procedures table
CREATE TABLE IF NOT EXISTS custom_procedures (
  id BIGSERIAL PRIMARY KEY,
  procedure_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default values
INSERT INTO custom_procedures (procedure_value) VALUES
  ('Facial Cleansing'),
  ('Chemical Peel'),
  ('Microdermabrasion'),
  ('Laser Treatment'),
  ('Dermaplaning'),
  ('LED Light Therapy'),
  ('Microneedling'),
  ('Hydrafacial'),
  ('Extraction'),
  ('Face Massage')
ON CONFLICT (procedure_value) DO NOTHING;

-- Verify insert
SELECT 'Procedures' as table_name, COUNT(*) as count FROM custom_procedures;
