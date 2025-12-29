-- Remove medicine_form column and add quantity column
-- Run this on your Supabase SQL editor

-- Add quantity column (text type to allow custom values)
ALTER TABLE prescription_medicines 
ADD COLUMN quantity TEXT;

-- Drop the old medicine_form column
ALTER TABLE prescription_medicines 
DROP COLUMN IF EXISTS medicine_form;
