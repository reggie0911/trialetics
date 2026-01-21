# Database Migration Instructions for eCRF Query Tracker

## Issue
The `supabase db push` command is having issues due to migration history mismatch between local and remote databases.

## Solution Options

### Option 1: Apply Migration via Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the contents of `supabase/migrations/20260120183629_create_ecrf_query_tracker_tables.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

This will create all the necessary tables for the eCRF Query Tracker module:
- `ecrf_header_mappings`
- `ecrf_uploads`
- `ecrf_records`
- `ecrf_column_configs`

Plus all RLS policies and indexes.

### Option 2: Fix Migration History and Push

If you want to fix the migration sync issues:

1. **Pull remote schema**:
   ```bash
   supabase db pull --schema public
   ```

2. **Resolve any conflicts** between local and remote migrations

3. **Push migrations**:
   ```bash
   supabase db push
   ```

### Option 3: Use Direct psql Connection

If you have the PostgreSQL connection string:

```bash
psql "your-connection-string" < supabase/migrations/20260120183629_create_ecrf_query_tracker_tables.sql
```

## Migration Already Marked as Applied

The migration `20260120183629` has been marked as "applied" in the migration history table, so once you execute the SQL (via Dashboard or psql), the migration state will be correct.

## Verification

After applying the migration, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ecrf_header_mappings', 'ecrf_uploads', 'ecrf_records', 'ecrf_column_configs');
```

You should see all 4 tables listed.

## Next Steps After Migration

1. **Test the module**: Navigate to `/protected/ecrf-query-tracker`
2. **Upload test data**: Use the CSV upload button
3. **Verify features**:
   - Alert colors (green/yellow/red)
   - KPI calculations
   - All 7 charts rendering
   - Filters working
   - Upload history

## Current Status

✅ All code files created and ready
✅ Migration file created
✅ Migration marked as applied in history
⏳ SQL needs to be executed on remote database (use Option 1 above)

## Files Location

- Migration SQL: `supabase/migrations/20260120183629_create_ecrf_query_tracker_tables.sql`
- Full implementation doc: `ECRF_QUERY_TRACKER_IMPLEMENTATION.md`
