-- Seed default modules for Clinical Trial Management System
INSERT INTO public.modules (name, description, active) VALUES
  ('patient_management', 'Manage patient enrollment, demographics, and visit schedules', true),
  ('data_entry', 'Enter and validate clinical trial data from case report forms', true),
  ('study_monitoring', 'Monitor study progress, milestones, and compliance', true),
  ('reporting_analytics', 'Generate reports and analyze trial data', true),
  ('document_management', 'Manage protocol documents, consent forms, and regulatory files', true),
  ('adverse_event_tracking', 'Track and report adverse events and serious adverse events', true),
  ('regulatory_submissions', 'Manage regulatory submissions and correspondence', true)
ON CONFLICT (name) DO NOTHING;
