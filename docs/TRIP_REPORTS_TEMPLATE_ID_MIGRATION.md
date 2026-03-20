# Trip Reports: Migration Plan for template_id = null

This document describes options for handling existing `trip_reports` records that have `template_id = null` after the Trip Report Workflow Association implementation (Option A).

## Context

- **Before:** Create Site Visit did not pass `template_id`; reports were created with `template_id = null`.
- **After:** Create Site Visit modal includes a Report Template selector; new reports can be associated with a template.
- **Existing data:** Reports created before this change have `template_id = null` and load with `template = null`, `questions = []` on the author page.

## Options

### Option 1: Leave Orphaned (Recommended for minimal risk)

No database migration. Existing reports remain as-is.

**UI considerations:**
- Author page shows "No template assigned" or similar when `template = null`.
- Consider adding a "Select template" step on the author page to allow users to attach a template to orphaned reports before authoring (see plan: Secondary recommendation).

**Pros:** No data changes, no migration risk.  
**Cons:** Author page may show empty/question-less state for old reports until template selection is added.

---

### Option 2: Assign Default Template by Visit Type

Run a one-time SQL migration that assigns a default template to reports with `template_id = null`, using the visit's `visit_type` to pick a matching template.

**Logic:**
1. For each `trip_report` with `template_id = null`, join to `monitoring_visits` to get `visit_type`.
2. Find the first active `visit_report_templates` row where `visit_report_type = visit_type` (and optionally `study_id` matches the visit's study).
3. Update `trip_reports.template_id` accordingly.

**Example SQL (illustrative):**

```sql
-- Assign default template by visit_type where only one active template exists per type
UPDATE trip_reports tr
SET template_id = (
  SELECT vrt.id
  FROM visit_report_templates vrt
  JOIN monitoring_visits mv ON mv.id = tr.visit_id
  WHERE vrt.visit_report_type = mv.visit_type
    AND vrt.template_status = 'active'
  ORDER BY vrt.created_at
  LIMIT 1
)
WHERE tr.template_id IS NULL;
```

**Pros:** Old reports get a template and display questions on the author page.  
**Cons:** Heuristic may not match user intent; multiple templates per visit type complicate the choice.

---

### Option 3: Assign by Study + Visit Type

If templates are study-linked (`study_id` is set), use study + visit type for more precise matching.

**Logic:** Same as Option 2, but add `vrt.study_id = mv.study_id OR vrt.study_id IS NULL` to prefer study-specific templates.

---

## Recommendation

Use **Option 1** unless there is a strong need for historical reports to have a template. Add the "Select template" step on the author page for `template = null` so users can attach a template manually when needed.
