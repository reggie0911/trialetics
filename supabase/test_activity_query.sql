-- Test query to verify activity data is visible
-- Run this to check if activities are inserted and visible

SELECT 
  oa.id,
  oa.organization_id,
  o.name as organization_name,
  oa.activity_type,
  oa.description,
  oa.performer_email,
  oa.created_at,
  oa.changed_fields
FROM organization_activity oa
JOIN organizations o ON o.id = oa.organization_id
WHERE o.organization_type = 'site'
ORDER BY oa.created_at DESC
LIMIT 20;
