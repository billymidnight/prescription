-- =============================================
-- CREATE TABLES FOR DROPDOWN VALUES
-- Copy and paste this entire script into Supabase SQL Editor
-- =============================================

-- 1. Create custom_quantities table
CREATE TABLE IF NOT EXISTS custom_quantities (
  id BIGSERIAL PRIMARY KEY,
  quantity_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create custom_times table
CREATE TABLE IF NOT EXISTS custom_times (
  id BIGSERIAL PRIMARY KEY,
  time_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create custom_frequencies table
CREATE TABLE IF NOT EXISTS custom_frequencies (
  id BIGSERIAL PRIMARY KEY,
  frequency_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create custom_durations table
CREATE TABLE IF NOT EXISTS custom_durations (
  id BIGSERIAL PRIMARY KEY,
  duration_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INSERT INITIAL VALUES
-- =============================================

-- Insert Quantity values
INSERT INTO custom_quantities (quantity_value) VALUES
('1'),
('2'),
('N/A')
ON CONFLICT (quantity_value) DO NOTHING;

-- Insert Time values
INSERT INTO custom_times (time_value) VALUES
('After Meal (Morning)'),
('After Meal (Evening)'),
('Before Food'),
('After Food')
ON CONFLICT (time_value) DO NOTHING;

-- Insert Frequency values
INSERT INTO custom_frequencies (frequency_value) VALUES
('Once daily'),
('Twice daily'),
('Three times daily'),
('Once at night'),
('Once in a week'),
('Twice a week'),
('Thrice a week'),
('Once a day'),
('Once a month'),
('As needed')
ON CONFLICT (frequency_value) DO NOTHING;

-- Insert Duration values
INSERT INTO custom_durations (duration_value) VALUES
('3 days'),
('5 days'),
('7 days'),
('10 days'),
('2 weeks'),
('3 weeks'),
('1 month'),
('2 months'),
('3 months')
ON CONFLICT (duration_value) DO NOTHING;

-- =============================================
-- VERIFY INSERTS
-- =============================================

SELECT 'Quantities' as table_name, COUNT(*) as count FROM custom_quantities
UNION ALL
SELECT 'Times' as table_name, COUNT(*) as count FROM custom_times
UNION ALL
SELECT 'Frequencies' as table_name, COUNT(*) as count FROM custom_frequencies
UNION ALL
SELECT 'Durations' as table_name, COUNT(*) as count FROM custom_durations;
