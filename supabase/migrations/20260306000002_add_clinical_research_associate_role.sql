-- Add clinical_research_associate to contact_role enum
-- Must run in separate transaction before seed that uses it
ALTER TYPE contact_role ADD VALUE IF NOT EXISTS 'clinical_research_associate';
