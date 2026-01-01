-- =============================================
-- RENAME FREQUENCY COLUMN TO AREASITE
-- Copy and paste this script into Supabase SQL Editor
-- =============================================

-- Rename the frequency column to areasite in prescription_medicines table
ALTER TABLE prescription_medicines 
RENAME COLUMN frequency TO areasite;

-- Rename the custom_frequencies table to custom_areasites
ALTER TABLE custom_frequencies 
RENAME TO custom_areasites;

-- Rename the column in custom_areasites table
ALTER TABLE custom_areasites 
RENAME COLUMN frequency_value TO areasite_value;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prescription_medicines' 
  AND column_name = 'areasite';

SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'custom_areasites';
