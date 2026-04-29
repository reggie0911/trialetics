-- Global directory role catalog: align category display `name` with product copy.
-- `code` is stable; only human-readable labels are updated.

UPDATE public.directory_role_categories AS d
SET name = v.name
FROM (VALUES
  ('sponsor', 'Sponsor Organization Roles'),
  ('cro', 'CRO (Contract Research Organization) Roles'),
  ('site', 'Clinical Site Roles'),
  ('regulatory_ethics', 'Regulatory & Ethics Roles'),
  ('vendors', 'Vendors & Service Providers'),
  ('financial', 'Financial & Contracting Roles'),
  ('governance', 'Study Governance & Committees'),
  ('technology', 'Technology & Systems Roles')
) AS v(code, name)
WHERE d.code = v.code;
