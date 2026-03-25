-- Add print-only fields to prescriptions table
-- These fields store data that appears on printed prescriptions but not in the main form

-- Add instructions column (text field for prescription instructions)
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add review_date column (date when patient should return)
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS review_date DATE;

-- Add investigations column (text field for lab tests/investigations)
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS investigations TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prescriptions'
AND column_name IN ('instructions', 'review_date', 'investigations');
