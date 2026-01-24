-- Manual fix: Link the SDV upload to the site data upload
-- Based on the upload IDs from the logs:
-- Site Data Upload ID: 528af492-99e6-401a-b29c-491dfc4ead12
-- SDV Data Upload ID: 47e0c696-7eca-48a3-9edd-dfc74f5e967a

UPDATE sdv_uploads
SET sdv_upload_id = '47e0c696-7eca-48a3-9edd-dfc74f5e967a'
WHERE id = '528af492-99e6-401a-b29c-491dfc4ead12'
AND sdv_upload_id IS NULL;

-- Verify the link was created
DO $$
DECLARE
  linked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO linked_count
  FROM sdv_uploads
  WHERE id = '528af492-99e6-401a-b29c-491dfc4ead12'
  AND sdv_upload_id = '47e0c696-7eca-48a3-9edd-dfc74f5e967a';
  
  IF linked_count = 0 THEN
    RAISE WARNING 'Link was not created. Check if upload IDs exist.';
  ELSE
    RAISE NOTICE 'Successfully linked SDV upload to site data upload.';
  END IF;
END $$;
