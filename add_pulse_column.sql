-- Add pulse column to visits table
ALTER TABLE visits 
ADD COLUMN pulse TEXT;

-- Column is nullable by default, existing rows will have NULL values
