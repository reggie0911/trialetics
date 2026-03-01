-- Expand budget template item and site budget item category constraints
-- to include clinical trial-specific categories alongside the existing finance categories.

ALTER TABLE public.budget_template_items
  DROP CONSTRAINT IF EXISTS budget_template_items_category_check;

ALTER TABLE public.budget_template_items
  ADD CONSTRAINT budget_template_items_category_check
  CHECK (category IN (
    'site_costs', 'personnel', 'travel', 'vendor', 'other',
    'screening', 'treatment', 'follow_up', 'lab', 'imaging',
    'pass_through', 'startup', 'closeout'
  ));

ALTER TABLE public.site_budget_items
  DROP CONSTRAINT IF EXISTS site_budget_items_category_check;

ALTER TABLE public.site_budget_items
  ADD CONSTRAINT site_budget_items_category_check
  CHECK (category IN (
    'site_costs', 'personnel', 'travel', 'vendor', 'other',
    'screening', 'treatment', 'follow_up', 'lab', 'imaging',
    'pass_through', 'startup', 'closeout'
  ));
