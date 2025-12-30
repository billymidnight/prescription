-- Create custom medicines table for managing the medicine dropdown list
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS custom_medicines (
  id SERIAL PRIMARY KEY,
  medicine_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_medicines_name ON custom_medicines(medicine_name);

-- Add RLS policies
ALTER TABLE custom_medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on custom_medicines" ON custom_medicines
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
