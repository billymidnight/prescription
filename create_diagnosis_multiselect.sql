-- =============================================
-- DIAGNOSIS: multiselect storage
-- Copy and paste this whole script into the Supabase SQL Editor.
-- Safe to run more than once. Safe to run while staff are entering data.
-- =============================================
--
-- READ THIS FIRST — how historical diagnosis data is protected:
--
--   * This script is PURELY ADDITIVE. It creates one new table. There is no
--     ALTER, no DROP, no UPDATE to prescriptions. Nothing existing is rewritten,
--     so the currently deployed app keeps working normally while it runs — you
--     can run this at any time, including mid-clinic, with staff still entering
--     data.
--
--   * RUN THIS BEFORE DEPLOYING THE NEW FRONTEND. The new code writes to
--     prescription_diagnoses on save; if the table is missing, saving reports a
--     failure. Nothing is lost when that happens (prescriptions.diagnosis is
--     written first, so the readable diagnosis still lands), but staff would see
--     an error. Running the SQL first avoids that window entirely.
--
--   * prescriptions.diagnosis IS KEPT AND KEPT UP TO DATE. The app now writes
--     BOTH the new child rows AND the joined text back into that column on every
--     save. It stays the readable value that PatientCard, the Scorp chatbot and
--     any report already rely on. It is not being retired.
--
--   * Legacy rows are read back as ONE diagnosis, verbatim. The app never
--     splits an old value on commas — an existing entry like
--     'Acne, post-inflammatory hyperpigmentation' stays a single intact item
--     rather than being torn into two wrong ones.


-- ---------------------------------------------
-- 1. Multiselect storage
--    One row per diagnosis per prescription, same shape as
--    prescription_medicines / prescription_investigations.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_diagnoses (
  id BIGSERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL,
  diagnosis_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prescription_id, diagnosis_value)
);

CREATE INDEX IF NOT EXISTS idx_prescription_diagnoses_prescription_id
  ON prescription_diagnoses(prescription_id);


-- ---------------------------------------------
-- 2. Seed the child table from existing history
--
--    OPTIONAL — the app already falls back to prescriptions.diagnosis for any
--    prescription with no child rows, so skipping this loses nothing. Running it
--    just makes the data uniform.
--
--    Each existing diagnosis is copied as a SINGLE value, exactly as typed.
--    It is deliberately NOT split on commas: splitting would turn one correct
--    historical diagnosis into several wrong ones, and that is not reversible.
--    The source column is only read here, never modified.
-- ---------------------------------------------
INSERT INTO prescription_diagnoses (prescription_id, diagnosis_value)
SELECT prescription_id, TRIM(diagnosis)
FROM prescriptions
WHERE diagnosis IS NOT NULL
  AND TRIM(diagnosis) <> ''
ON CONFLICT (prescription_id, diagnosis_value) DO NOTHING;


-- ---------------------------------------------
-- 3. Verify — the two counts below should match, and no prescription that had
--    a diagnosis should be missing from the child table.
-- ---------------------------------------------
SELECT 'prescriptions with a diagnosis' AS what,
       COUNT(*) AS count
FROM prescriptions
WHERE diagnosis IS NOT NULL AND TRIM(diagnosis) <> ''
UNION ALL
SELECT 'prescriptions represented in prescription_diagnoses',
       COUNT(DISTINCT prescription_id)
FROM prescription_diagnoses;

-- Should return zero rows. Anything listed here has history that did not carry
-- over — tell me before saving any further prescriptions if it is not empty.
SELECT p.prescription_id, p.diagnosis
FROM prescriptions p
LEFT JOIN prescription_diagnoses d ON d.prescription_id = p.prescription_id
WHERE p.diagnosis IS NOT NULL
  AND TRIM(p.diagnosis) <> ''
  AND d.prescription_id IS NULL;


-- =============================================
-- ROLLBACK, if you ever want to undo this
-- prescriptions.diagnosis is untouched by this script and stays authoritative,
-- so dropping the child table loses no historical data:
--
--   DROP TABLE IF EXISTS prescription_diagnoses;
-- =============================================
