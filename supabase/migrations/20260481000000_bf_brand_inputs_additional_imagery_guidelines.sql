-- Optional user-authored imagery guidelines (Imagery workspace), persisted with the study brief.

ALTER TABLE bf_brand_inputs
  ADD COLUMN IF NOT EXISTS additional_imagery_guidelines text;
