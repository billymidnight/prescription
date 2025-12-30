-- Step 1: Create custom medicines table
CREATE TABLE IF NOT EXISTS custom_medicines (
  id SERIAL PRIMARY KEY,
  medicine_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_medicines_name ON custom_medicines(medicine_name);

-- Enable RLS
ALTER TABLE custom_medicines ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for authenticated users
CREATE POLICY "Allow all operations on custom_medicines" ON custom_medicines
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
