-- Add medicine_form and quantity columns to prescription_medicines table
ALTER TABLE prescription_medicines 
ADD COLUMN medicine_form TEXT,
ADD COLUMN quantity TEXT;

-- Columns are nullable by default, existing rows will have NULL values
