# SDV Tracker Performance Testing Plan

## Setup

1. Start the development server (if not already running)
2. Navigate to the SDV Tracker page
3. Ensure you have at least one upload with data

## Test Execution

### Test 1: Verify React Query Integration

**Goal**: Confirm React Query is working without errors

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Refresh the SDV Tracker page
4. **Expected**: No React Query errors in console
5. **Expected**: Page loads successfully

### Test 2: Measure Cache Performance (Primary Test)

**Goal**: Measure the performance improvement from caching

**Steps**:
1. Clear the debug log file (if it exists):
   - File location: `c:\Users\reggi\trialetics\.cursor\debug.log`
   - Delete it or it will be auto-created

2. Expand a site node
   - **Expected**: 4-7 second load time (first fetch)
   - **Look for**: "Fetching data from server" in console
   - Debug log will show: `fetchDuration` and `totalDuration`

3. Collapse the same site node

4. Re-expand the same site node
   - **Expected**: <100ms load time (from cache)
   - **Look for**: "Using cached data" in console
   - Debug log will show: `source: 'react-query'` or `source: 'local'`

5. Read the debug log:
   ```bash
   type c:\Users\reggi\trialetics\.cursor\debug.log
   ```

6. Compare the `totalDuration` values:
   - First expansion: Should be 4000-7000ms
   - Second expansion: Should be <100ms

**Success Criteria**:
- Second expansion is >90% faster than first expansion
- Debug log shows cache hits on second expansion

### Test 3: Verify Prefetching

**Goal**: Confirm prefetching is loading data in advance

**Steps**:
1. Clear debug log
2. Expand a site node (wait for it to complete)
3. Immediately expand the first subject under that site
   - **Expected**: <500ms load time (prefetched)
4. Expand the second subject
   - **Expected**: <500ms load time (prefetched)
5. Expand the third subject
   - **Expected**: <500ms load time (prefetched)
6. Expand the fourth subject (if exists)
   - **Expected**: Normal 4-7 second load time (not prefetched)

**Success Criteria**:
- First 3 subjects load significantly faster than the 4th
- Debug log shows "Fetch completed" with low `fetchDuration` for prefetched items

### Test 4: Cache Invalidation

**Goal**: Ensure cache is properly invalidated when needed

**Steps**:
1. Expand several nodes
2. Change a filter (e.g., select a different site name)
3. Re-expand the same nodes
   - **Expected**: Fresh data is fetched (cache invalidated due to filter change)

**Success Criteria**:
- Changing filters causes new data fetches
- Debug log shows "Fetching data from server" after filter change

### Test 5: Navigation Patterns

**Goal**: Verify cache works across navigation

**Steps**:
1. Expand Site A → Subject 1 → Visit 1
2. Collapse everything
3. Expand Site B → Subject 1
4. Collapse everything
5. Re-expand Site A → Subject 1 → Visit 1
   - **Expected**: All nodes load instantly from cache

**Success Criteria**:
- All previously expanded nodes load in <100ms
- Debug log shows cache hits for all re-opened nodes

## Debug Log Analysis

### Key Metrics

Look for these fields in the debug log JSON entries:

```json
{
  "location": "sdv-tracker-page-client.tsx:220",
  "message": "Node toggle start",
  "data": {
    "level": "site",
    "nodeId": "site-Site001",
    "siteName": "Site001"
  },
  "timestamp": 1706655123456,
  "hypothesisId": "H1"
}
```

```json
{
  "location": "sdv-tracker-page-client.tsx:356",
  "message": "Fetch completed",
  "data": {
    "level": "site",
    "nodeId": "site-Site001",
    "success": true,
    "recordCount": 25,
    "fetchDuration": 4523
  },
  "hypothesisId": "H3"
}
```

```json
{
  "location": "sdv-tracker-page-client.tsx:410",
  "message": "Using cached data",
  "data": {
    "nodeId": "site-Site001",
    "level": "site",
    "source": "react-query"
  },
  "hypothesisId": "H2"
}
```

```json
{
  "location": "sdv-tracker-page-client.tsx:436",
  "message": "Node toggle completed",
  "data": {
    "level": "site",
    "nodeId": "site-Site001",
    "totalDuration": 4678
  },
  "hypothesisId": "H1"
}
```

### Hypothesis Validation

- **H1**: Node toggle operations complete faster with caching
  - Compare `totalDuration` for first vs subsequent expansions
  - **Expected**: >90% reduction

- **H2**: Cache hits avoid server requests
  - Look for "Using cached data" messages
  - Check `source` field: "react-query" or "local"
  - **Expected**: All re-expansions use cache

- **H3**: Prefetching reduces perceived load time
  - Compare `fetchDuration` for prefetched vs non-prefetched items
  - **Expected**: Prefetched items have lower `fetchDuration`

- **H4**: Errors are properly logged and handled
  - Check for "Fetch error" messages
  - Verify error handling doesn't break the UI

## Expected Results Summary

| Scenario | First Load | Cached Load | Improvement |
|----------|-----------|-------------|-------------|
| Site expansion | 4-7s | <100ms | 95%+ |
| Subject expansion (prefetched) | 4-7s | <500ms | 85%+ |
| Subject expansion (cached) | 4-7s | <100ms | 95%+ |
| Visit expansion (prefetched) | 4-7s | <500ms | 85%+ |
| Visit expansion (cached) | 4-7s | <100ms | 95%+ |

## Troubleshooting

### Issue: No performance improvement

**Possible Causes**:
1. Browser cache disabled in DevTools
2. React Query not initialized properly
3. Cache keys not matching

**Debug Steps**:
- Check console for React Query errors
- Verify `ReactQueryProvider` is in layout
- Check debug log for cache hit/miss patterns

### Issue: Debug log file not created

**Possible Causes**:
1. Logging server not running
2. Network fetch blocked
3. File permissions issue

**Debug Steps**:
- Check console for fetch errors
- Verify log server URL is correct
- Try creating file manually to test permissions

### Issue: Prefetching not working

**Possible Causes**:
1. Prefetch calls failing silently
2. Query keys not matching
3. Data structure mismatch

**Debug Steps**:
- Check console for prefetch errors
- Verify first 3 items have slower load than expected
- Check debug log for prefetch call patterns

## After Testing

1. Review debug log for performance metrics
2. Calculate average improvement percentages
3. Identify any remaining bottlenecks
4. Document results in `SDV_PERFORMANCE_OPTIMIZATIONS.md`

## Notes

- Cold cache (first load) will always be slow - this is expected
- Performance improvements are most visible on subsequent loads
- Prefetching works best for sequential access patterns
- Cache automatically expires after 5 minutes
