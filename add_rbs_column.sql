-- =============================================
-- ADD RBS (RANDOM BLOOD SUGAR) TO VISITS
-- Copy and paste this script into the Supabase SQL Editor.
-- Safe to run more than once.
-- =============================================
--
-- Purely additive: one new nullable column. Nothing existing is rewritten, so
-- this can be run at any time, including while staff are entering data.
--
-- TEXT rather than a number, to match the existing weight / blood_pressure /
-- pulse columns — staff type free-form values there ("110 mg/dL", "~140") and a
-- numeric column would reject them.
--
-- Every existing visit gets NULL, which the app renders as "Not recorded".

ALTER TABLE visits
ADD COLUMN IF NOT EXISTS rbs TEXT;

-- Verify: rbs should be listed alongside the other vitals, all nullable.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'visits'
  AND column_name IN ('weight', 'blood_pressure', 'pulse', 'rbs')
ORDER BY column_name;
