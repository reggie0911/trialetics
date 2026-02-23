-- Add extended protocol phase values to support user-selected labels
-- Previously: Early Feasibility Study, First In-Human, Pilot Stage, Pivotal, Post Market
-- were all stored as 'observational' and displayed as "Observational"

ALTER TYPE protocol_phase ADD VALUE IF NOT EXISTS 'early_feasibility_study';
ALTER TYPE protocol_phase ADD VALUE IF NOT EXISTS 'first_in_human';
ALTER TYPE protocol_phase ADD VALUE IF NOT EXISTS 'pilot_stage';
ALTER TYPE protocol_phase ADD VALUE IF NOT EXISTS 'pivotal';
ALTER TYPE protocol_phase ADD VALUE IF NOT EXISTS 'post_market';
