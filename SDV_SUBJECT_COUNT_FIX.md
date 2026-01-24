# SDV Tracker Subject Count Fix

## Problem
When expanding "Healthycore" in the SDV tracker hierarchical table, only 1 subject was displayed instead of the expected 42 subjects.

## Root Cause Analysis
The issue was in the `getSDVSiteDetails` function which fetches detailed records when a site is expanded. The query was missing explicit filtering for NULL/empty `subject_id` values and wasn't providing diagnostic information about what was being fetched.

## Changes Made

### 1. Updated `getSDVSiteDetails` Function
**File**: `lib/actions/sdv-tracker-data.ts`

**Changes**:
- Added `{ count: 'exact' }` to the query to get total record count from the database
- Added explicit filters to exclude NULL/empty `subject_id` values:
  ```typescript
  .not('subject_id', 'is', null)
  .neq('subject_id', '')
  ```
- Enhanced logging to show:
  - Total records fetched
  - Total count in database
  - Unique subject count
- Fixed ordering to use actual column names (`event_name`, `form_name`) instead of aliases

### 2. Updated `get_sdv_site_summary` RPC Function
**File**: `supabase/migrations/20260124070000_optimize_sdv_performance.sql`

**Changes**:
- Added `total_subjects BIGINT` to return type
- Added `COUNT(DISTINCT v.subject_id)` to calculate unique subjects per site
- Added filters to exclude NULL/empty subject_ids:
  ```sql
  WHERE v.upload_id = p_upload_id
    AND v.subject_id IS NOT NULL
    AND TRIM(v.subject_id) != ''
  ```

### 3. Updated TypeScript Mapping
**File**: `lib/actions/sdv-tracker-data.ts`

**Changes**:
- Added `total_subjects: row.total_subjects || 0` to the site summary mapping

## Diagnostic Tools Created

### 1. `diagnose_healthycore_subjects.sql`
SQL script to diagnose subject count issues:
- Checks raw data in `sdv_site_data_raw`
- Checks processed data in `sdv_merged_view`  
- Identifies NULL/empty subject_ids
- Lists actual subject IDs
- Checks JOIN issues with `sdv_upload_id`

## Testing

After applying the fix:
1. Refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
2. Select the upload containing Healthycore
3. Expand the Healthycore site in the hierarchical table
4. Check the browser console for diagnostic logs:
   ```
   [SDV Site Details] Fetched X records for Healthycore (Total in DB: Y, Unique subjects: 42)
   ```

## Expected Results
- ✅ Healthycore should show 42 subjects when expanded
- ✅ All subjects should be visible in the hierarchy
- ✅ Console logs should show the correct counts
- ✅ Site summary RPC should return `total_subjects: 42` for Healthycore

## If Issue Persists

Run the diagnostic SQL (`diagnose_healthycore_subjects.sql`) to check:
1. How many subjects exist in `sdv_site_data_raw` for Healthycore
2. How many appear in `sdv_merged_view`
3. If there are NULL/empty `subject_id` values
4. If `sdv_upload_id` is properly linked

The diagnostic will reveal if:
- Data wasn't inserted correctly during chunked upload
- The view is filtering records incorrectly
- Subject IDs are NULL or empty in the raw data

## Related Issues
- CSV chunking implementation
- View JOIN logic with `sdv_upload_id`
- NULL/empty subject_id handling
