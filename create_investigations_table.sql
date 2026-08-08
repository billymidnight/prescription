-- =============================================
-- INVESTIGATIONS: dropdown list + multiselect storage
-- Copy and paste this whole script into the Supabase SQL Editor.
-- Safe to run more than once. Purely additive — no ALTER, no DROP.
--
-- RUN THIS BEFORE DEPLOYING THE NEW FRONTEND: the new code writes to
-- prescription_investigations on save, and saving reports a failure if the
-- table is missing.
-- =============================================


-- ---------------------------------------------
-- 1. Managed dropdown list (Drug Order -> Investigations tab)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS custom_investigations (
  id BIGSERIAL PRIMARY KEY,
  investigation_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ---------------------------------------------
-- 2. Remove the placeholder seed values
--    Named explicitly so anything staff added by hand is left alone.
--    No-op if the earlier seed script was never run.
-- ---------------------------------------------
DELETE FROM custom_investigations WHERE investigation_value IN (
  'Complete Blood Count (CBC)',
  'Erythrocyte Sedimentation Rate (ESR)',
  'Fasting Blood Sugar (FBS)',
  'HbA1c',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Renal Function Test (RFT)',
  'Thyroid Profile (T3, T4, TSH)',
  'Serum Ferritin',
  'Serum Vitamin D',
  'Serum Vitamin B12',
  'KOH Mount',
  'Fungal Culture',
  'Skin Biopsy',
  'Patch Test',
  'Wood Lamp Examination',
  'Dermoscopy',
  'Trichoscopy',
  'VDRL',
  'Urine Routine'
);


-- ---------------------------------------------
-- 3. Insert the real list
--    Add / edit / delete any of these from the Drug Order page, no SQL needed.
-- ---------------------------------------------
INSERT INTO custom_investigations (investigation_value) VALUES
  ('FBS'),
  ('PPBS'),
  ('HbA1c'),
  ('T3'),
  ('T4'),
  ('TSH'),
  ('CBC'),
  ('FLP'),
  ('LFT'),
  ('ANA'),
  ('Se. Iron'),
  ('Se. Vit B12'),
  ('Se. Vit D'),
  ('Se. Zinc'),
  ('HIV 1 & 2'),
  ('HCV'),
  ('HbsAg')
ON CONFLICT (investigation_value) DO NOTHING;


-- ---------------------------------------------
-- 4. Multiselect storage
--    One row per investigation per prescription, the same shape as
--    prescription_medicines. A prescription with no investigations simply has
--    no rows here, so every existing prescription stays empty automatically.
--
--    Why a child table instead of a delimited text column: a staff-typed
--    custom entry can itself contain a comma, which makes join/split
--    ambiguous and silently corrupts the list on the next save.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_investigations (
  id BIGSERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL,
  investigation_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prescription_id, investigation_value)
);

CREATE INDEX IF NOT EXISTS idx_prescription_investigations_prescription_id
  ON prescription_investigations(prescription_id);


-- ---------------------------------------------
-- 5. Carry over anything already saved in the old single-value column
--    Only matters if a prescription was saved between the previous change and
--    this one. Harmless when there is nothing to move.
-- ---------------------------------------------
INSERT INTO prescription_investigations (prescription_id, investigation_value)
SELECT prescription_id, TRIM(investigations)
FROM prescriptions
WHERE investigations IS NOT NULL
  AND TRIM(investigations) <> ''
ON CONFLICT (prescription_id, investigation_value) DO NOTHING;


-- ---------------------------------------------
-- 6. Verify
-- ---------------------------------------------
SELECT 'dropdown options' AS what, COUNT(*) AS count FROM custom_investigations
UNION ALL
SELECT 'prescription rows', COUNT(*) FROM prescription_investigations;


-- =============================================
-- NOTE: do NOT drop prescriptions.investigations.
-- The app writes BOTH the child rows and the joined text back into that column
-- on every save, so it stays a readable mirror for PatientCard, the Scorp
-- chatbot and any report — exactly like prescriptions.diagnosis.
--
-- OPTIONAL, only if prescriptions.prescription_id is a primary key —
-- adds referential integrity so investigations cannot outlive their
-- prescription (note: prescription_medicines has no such constraint today):
--
--   ALTER TABLE prescription_investigations
--     ADD CONSTRAINT fk_prescription_investigations_prescription
--     FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id)
--     ON DELETE CASCADE;
-- =============================================
