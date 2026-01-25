# CSV Chunk Aggregation Fix

## Problem
After implementing CSV chunking for large uploads (>10MB), users received a "Failed to fetch aggregations" error when viewing newly uploaded data in the SDV Tracker.

## Root Cause
The aggregation function (`getSDVAggregations`) was being called immediately when an upload was selected, before chunked uploads had finished processing all chunks. This caused the database RPC function to fail because:

1. **Chunked uploads process sequentially** - Each chunk is uploaded and processed one at a time
2. **Aggregations were called too early** - The UI attempted to fetch metrics before all chunks were processed and the `merge_status` was set to "completed"
3. **The view depends on complete data** - The `sdv_merged_view` needs all chunks to be processed and linked properly to calculate accurate metrics

## Solution Implemented

### 1. Added `merge_status` Check in `loadAggregations`
**File**: `components/sdv-tracker/sdv-tracker-page-client.tsx`

```typescript
const loadAggregations = async (uploadId: string) => {
  try {
    // Fetch the latest upload status to check merge_status
    const supabase = await import('@/lib/client').then(m => m.createClient());
    const { data: uploadData, error: uploadError } = await supabase
      .from('sdv_uploads')
      .select('merge_status')
      .eq('id', uploadId)
      .single();
    
    if (uploadError) {
      console.error('[SDV Aggregations] Error fetching upload:', uploadError);
      return;
    }
    
    // Skip aggregations if upload is still being processed
    if (uploadData && uploadData.merge_status !== 'completed') {
      console.log(`[SDV Aggregations] Skipping - upload merge_status is "${uploadData.merge_status}", waiting for "completed"`);
      return;
    }
    
    // ... continue with aggregation fetch
  }
}
```

**What this does:**
- Fetches the latest upload status from the database before attempting aggregations
- Checks if `merge_status` is "completed" 
- Skips aggregation fetch if the upload is still processing (merge_status = "pending")
- Prevents the RPC error by not calling it prematurely

### 2. Enhanced Upload Completion Handler
**File**: `components/sdv-tracker/sdv-tracker-page-client.tsx`

```typescript
<SDVUploadProgress 
  companyId={companyId}
  onComplete={async (job) => {
    // Refresh data when background upload completes
    await loadUploads();
    
    // If this job created an upload, select it and load its data
    if (job.upload_id) {
      setSelectedUploadId(job.upload_id);
      await loadData(job.upload_id);
      // Aggregations will load automatically once merge_status is completed
      await loadAggregations(job.upload_id);
    } else if (selectedUploadId) {
      // Otherwise refresh the current upload
      await loadData(selectedUploadId);
      await loadAggregations(selectedUploadId);
    }
  }}
/>
```

**What this does:**
- Automatically selects and displays the newly uploaded data when a job completes
- Calls `loadAggregations` after the job is marked as completed
- The `merge_status` check ensures aggregations only load when ready

### 3. Added Processing State UI
**File**: `components/sdv-tracker/sdv-tracker-page-client.tsx`

Added a visual indicator when an upload is still processing:

```typescript
{selectedUploadId && !aggregations && !isLoading && 
  uploads.find(u => u.id === selectedUploadId)?.merge_status !== 'completed' && (
  <Card className="border-blue-200 bg-blue-50">
    <CardContent className="py-6">
      <div className="text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
        <p className="text-sm font-medium text-blue-900">Processing Upload</p>
        <p className="text-xs text-blue-700 mt-1">
          Metrics will appear once all chunks are processed and merged
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

**What this does:**
- Shows a friendly loading message while chunks are being processed
- Informs users that metrics will appear automatically when ready
- Provides better UX than a blank screen or error message

## How the Full Flow Works Now

1. **User uploads large file (>10MB)**
   - Client splits into chunks
   - Each chunk uploaded sequentially to Storage
   - Edge Function processes each chunk

2. **First chunk processing**
   - Creates `sdv_uploads` record with `merge_status = "pending"`
   - Stores `upload_id` in `upload_jobs` table
   - Processes and inserts data

3. **Subsequent chunks processing**
   - Retrieve `upload_id` from job
   - Reuse same `sdv_uploads` record
   - Accumulate row counts

4. **Last chunk processing**
   - Marks job as `status = "completed"`
   - Updates `merge_status = "completed"` (only for last chunk)
   - Triggers `onComplete` callback

5. **UI automatically updates**
   - Refreshes upload list
   - Selects the completed upload
   - Shows "Processing Upload" message initially
   - Checks `merge_status` before fetching aggregations
   - Loads and displays metrics once `merge_status = "completed"`

## Testing
Upload a CSV file larger than 10MB and verify:
- ✅ Chunks upload sequentially
- ✅ Only ONE upload record appears in history
- ✅ "Processing Upload" message shows while chunks process
- ✅ Metrics/KPI cards appear automatically when complete
- ✅ No "Failed to fetch aggregations" error
- ✅ Total row count reflects all chunks combined

## Files Modified
- `components/sdv-tracker/sdv-tracker-page-client.tsx` - Added merge_status checks and processing UI
- `supabase/functions/process-csv-upload/index.ts` - Already updated with chunk consolidation logic (previous fix)

## Related Documentation
- See `CHUNK_CONSOLIDATION_IMPLEMENTATION.md` for details on how chunks are consolidated in the Edge Function
