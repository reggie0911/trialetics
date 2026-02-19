-- Add protocol_id column to sdv_reports
ALTER TABLE sdv_reports ADD COLUMN IF NOT EXISTS protocol_id uuid REFERENCES clinical_protocols(id);

-- Backfill existing uploads with the correct protocol_id based on company_id
UPDATE ae_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE ae_uploads.company_id = cp.company_id AND ae_uploads.protocol_id IS NULL;

UPDATE mc_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE mc_uploads.company_id = cp.company_id AND mc_uploads.protocol_id IS NULL;

UPDATE vw_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE vw_uploads.company_id = cp.company_id AND vw_uploads.protocol_id IS NULL;

UPDATE ecrf_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE ecrf_uploads.company_id = cp.company_id AND ecrf_uploads.protocol_id IS NULL;

UPDATE patient_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE patient_uploads.company_id = cp.company_id AND patient_uploads.protocol_id IS NULL;

UPDATE sdv_uploads SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE sdv_uploads.company_id = cp.company_id AND sdv_uploads.protocol_id IS NULL;

UPDATE sdv_reports SET protocol_id = cp.id
FROM clinical_protocols cp
WHERE sdv_reports.company_id = cp.company_id AND sdv_reports.protocol_id IS NULL;
