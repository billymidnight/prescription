-- Create custom_findings table for storing custom findings & symptoms dropdown options
CREATE TABLE IF NOT EXISTS custom_findings (
  id SERIAL PRIMARY KEY,
  finding_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default values
INSERT INTO custom_findings (finding_value) VALUES
  ('Acne vulgaris'),
  ('Melasma'),
  ('Eczema'),
  ('Psoriasis'),
  ('Hair loss'),
  ('Dandruff'),
  ('Fungal infection'),
  ('Vitiligo'),
  ('Hyperpigmentation'),
  ('Dry skin')
ON CONFLICT (finding_value) DO NOTHING;
