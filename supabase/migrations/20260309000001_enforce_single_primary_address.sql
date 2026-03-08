-- Enforce at most one primary address per (entity_type, entity_id)
-- Step 1: Fix existing data - for entities with multiple primaries, keep only the first (by created_at) and unset the rest
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY entity_type, entity_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.addresses
  WHERE is_primary = true
)
UPDATE public.addresses a
SET is_primary = false
FROM duplicates d
WHERE a.id = d.id AND d.rn > 1;

-- Step 2: Create partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_primary_per_entity
  ON public.addresses (entity_type, entity_id)
  WHERE is_primary = true;
