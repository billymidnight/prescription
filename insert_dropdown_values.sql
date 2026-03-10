-- =============================================================================
-- INSERT DEFAULT VALUES FOR DROPDOWN TABLES
-- Run this AFTER creating the tables
-- =============================================================================

-- 1. INSERT QUANTITIES
-- =============================================================================
INSERT INTO custom_quantities (quantity_value) VALUES
('1'),
('2'),
('N/A')
ON CONFLICT (quantity_value) DO NOTHING;


-- 2. INSERT TIMES
-- =============================================================================
INSERT INTO custom_times (time_value) VALUES
('After Meal (Morning)'),
('After Meal (Evening)'),
('Before Food'),
('After Food')
ON CONFLICT (time_value) DO NOTHING;


-- 3. INSERT AREASITES (Frequency)
-- =============================================================================
INSERT INTO custom_areasites (areasite_value) VALUES
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
ON CONFLICT (areasite_value) DO NOTHING;


-- 4. INSERT DURATIONS
-- =============================================================================
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


-- 5. INSERT DIAGNOSIS (Common dermatology diagnoses)
-- =============================================================================
INSERT INTO custom_diagnosis (diagnosis_value) VALUES
('Acne Vulgaris'),
('Atopic Dermatitis'),
('Psoriasis'),
('Seborrheic Dermatitis'),
('Urticaria'),
('Vitiligo'),
('Hair Fall'),
('Fungal Infection'),
('Eczema'),
('Contact Dermatitis')
ON CONFLICT (diagnosis_value) DO NOTHING;


-- 6. INSERT INSTRUCTIONS
-- =============================================================================
INSERT INTO custom_instructions (instruction_value) VALUES
('Review after 10 days'),
('Review after 15 days'),
('Review after 1 month'),
('Review after 2 months'),
('Review after 3 months'),
('Continue as advised'),
('Apply as directed'),
('Take as prescribed')
ON CONFLICT (instruction_value) DO NOTHING;


-- 7. INSERT PROCEDURES
-- =============================================================================
INSERT INTO custom_procedures (procedure_value) VALUES
('No Procedure'),
('Skin Biopsy'),
('Cryotherapy'),
('Chemical Peel'),
('Laser Treatment'),
('Intralesional Injection'),
('Dermoscopy'),
('Patch Test'),
('KOH Test'),
('Wood Lamp Examination')
ON CONFLICT (procedure_value) DO NOTHING;
