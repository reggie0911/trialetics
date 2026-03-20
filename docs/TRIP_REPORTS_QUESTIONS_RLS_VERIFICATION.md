# Trip Reports: RLS Verification for Missing Questions

This document supports the investigation of why the Visit Report Author page may show no questions section. Use it to verify Row Level Security (RLS) policies and data flow.

## Client Context

The app uses `createClient()` from [lib/server.ts](../lib/server.ts), which creates a Supabase client with the **anon key** and the **user's session** (from cookies). RLS policies therefore apply to all queries. If the user is not authenticated or `profiles.company_id` does not match the template's `company_id`, template and questions fetches may return no rows.

---

## RLS Policy Summary

### visit_report_templates

| Policy | Condition |
|--------|-----------|
| SELECT | `company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())` |
| INSERT/UPDATE/DELETE | Same company_id match |

**Failure mode**: If the user has no profile, or `profiles.company_id` does not match the template's `company_id`, the template fetch returns no row (and Supabase `.single()` yields null/error).

### visit_report_template_questions

| Policy | Condition |
|--------|-----------|
| SELECT | `template_id IN (SELECT id FROM visit_report_templates WHERE company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))` |
| INSERT/UPDATE/DELETE | Same template company check |

**Failure mode**: If the user cannot see the template (company mismatch), they cannot see its questions either.

### trip_reports

Uses existing policies. The report is fetched by `visit_id`; RLS on `trip_reports` and `monitoring_visits` must allow the user to read the visit/report.

---

## Verification Steps

### 1. Check Diagnostic Logs (Development)

When visiting `/protected/trip-reports/[visitId]/author`, the server logs (terminal running `npm run dev`) will show `[TripReportDebug]` entries in development, for example:

- `no template_id on report` → report has no template linked (Cause #1)
- `template not found` + `templateFetchError` → template missing or RLS blocking (Cause #3 or #4)
- `templateFound: true` but `questionsCount: 0` → template exists but no questions, or RLS blocking questions (Cause #2 or #4)

### 2. Run Quick Verification SQL

Replace `:visitId` with the actual visit ID from the URL (e.g. `1552070d-...`).

```sql
-- Run as service role (bypasses RLS) to see raw data
WITH latest_report AS (
  SELECT id, visit_id, template_id
  FROM trip_reports
  WHERE visit_id = :visitId
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  r.id AS report_id,
  r.template_id,
  t.id AS template_exists,
  t.name AS template_name,
  (SELECT COUNT(*) FROM visit_report_template_questions q WHERE q.template_id = r.template_id) AS question_count
FROM latest_report r
LEFT JOIN visit_report_templates t ON t.id = r.template_id;
```

### 3. Compare Service Role vs Authenticated User

1. **As service role** (Supabase SQL Editor or `supabase db`): Run the verification query above. Note `template_id`, `template_exists`, `template_name`, `question_count`.
2. **As authenticated user** (e.g. via app or `auth.uid()` in SQL): Run equivalent selects. If using SQL, set session:
   ```sql
   SELECT set_config('request.jwt.claims', '{"sub": "<user-uuid>"}', true);
   -- Then run the template and questions selects
   ```
3. If service role sees data but authenticated user does not → RLS is blocking (Cause #4).

### 4. Verify Profile Company

```sql
-- Check that the user has a profile with company_id
SELECT id, user_id, company_id FROM profiles WHERE user_id = auth.uid();

-- Check template company
SELECT id, name, company_id FROM visit_report_templates WHERE id = :templateId;
```

If `profiles.company_id` ≠ `visit_report_templates.company_id`, RLS will block template and questions.

---

## Migration Reference

RLS policies are defined in: [supabase/migrations/20260319000000_visit_report_module.sql](../supabase/migrations/20260319000000_visit_report_module.sql)
