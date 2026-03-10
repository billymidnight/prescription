-- =============================================================================
-- DATABASE UPDATES & FIXES
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. UPDATE PATIENTS TABLE - Add "Other" gender option
-- =============================================================================
-- Check if patients table has gender constraint
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_gender_check;

-- Add new constraint with "Other" option
ALTER TABLE patients ADD CONSTRAINT patients_gender_check 
CHECK (gender IN ('Male', 'Female', 'Other'));


-- 2. UPDATE VISITS TABLE - Update consultation type options
-- =============================================================================
-- Drop existing constraint if any
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_consultation_type_check;

-- Add new constraint with updated options
ALTER TABLE visits ADD CONSTRAINT visits_consultation_type_check 
CHECK (consultation_type IN (
  'Skin',
  'Hair',
  'Nail',
  'Skin + Hair',
  'Skin + Nail',
  'Hair + Nail',
  'Skin + Hair + Nail',
  'Online Hair',
  'Online Skin',
  'Online Nail'
));


-- 3. UPDATE VISITS TABLE - Update payment method options
-- =============================================================================
-- Drop existing constraint if any
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_paymentmethod_check;

-- Add new constraint with combo options
ALTER TABLE visits ADD CONSTRAINT visits_paymentmethod_check 
CHECK (paymentmethod IN (
  'Cash',
  'Card',
  'GPay',
  'Cash+Card',
  'Cash+GPay',
  'Card+GPay'
));


-- 4. VERIFY PRESCRIPTIONS TABLE - Ensure instructions column exists
-- =============================================================================
-- Add instructions column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prescriptions' 
        AND column_name = 'instructions'
    ) THEN
        ALTER TABLE prescriptions ADD COLUMN instructions TEXT;
    END IF;
END $$;


-- 5. VERIFY PRESCRIPTIONS TABLE - Ensure review_date column exists
-- =============================================================================
-- Add review_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prescriptions' 
        AND column_name = 'review_date'
    ) THEN
        ALTER TABLE prescriptions ADD COLUMN review_date TEXT;
    END IF;
END $$;


-- 6. VERIFY PRESCRIPTIONS TABLE - Ensure investigations column exists
-- =============================================================================
-- Add investigations column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prescriptions' 
        AND column_name = 'investigations'
    ) THEN
        ALTER TABLE prescriptions ADD COLUMN investigations TEXT;
    END IF;
END $$;
