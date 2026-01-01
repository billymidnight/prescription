-- =============================================
-- CREATE TABLE FOR INSTRUCTIONS DROPDOWN
-- Copy and paste this script into Supabase SQL Editor
-- =============================================

-- Create custom_instructions table
CREATE TABLE IF NOT EXISTS custom_instructions (
  id BIGSERIAL PRIMARY KEY,
  instruction_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial instruction value
INSERT INTO custom_instructions (instruction_value) VALUES
('Apply Shampoo')
ON CONFLICT (instruction_value) DO NOTHING;

-- Verify insert
SELECT 'Instructions' as table_name, COUNT(*) as count FROM custom_instructions;
