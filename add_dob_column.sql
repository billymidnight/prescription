-- =============================================
-- ADD DATE OF BIRTH (DOB) COLUMN TO PATIENTS TABLE
-- Copy and paste this script into Supabase SQL Editor
-- =============================================

-- Add nullable dob column (keeps year_of_birth intact for existing records)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS dob DATE;

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('year_of_birth', 'dob');
