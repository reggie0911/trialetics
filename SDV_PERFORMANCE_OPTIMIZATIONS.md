# SDV Tracker Performance Optimizations

## Summary

This document outlines the performance optimizations implemented for the SDV Tracker to improve data loading speed.

## Optimizations Implemented

### 1. React Query Integration (Client-Side Caching)

**What**: Integrated `@tanstack/react-query` for intelligent client-side caching and data management.

**Files Created/Modified**:
- Created `components/providers/react-query-provider.tsx` - React Query provider wrapper
- Created `hooks/use-sdv-data.ts` - Custom hooks for SDV data fetching with caching
- Modified `app/layout.tsx` - Added ReactQueryProvider to app
- Modified `components/sdv-tracker/sdv-tracker-page-client.tsx` - Integrated caching and prefetching

**Benefits**:
- **Eliminates redundant network requests**: Data fetched once is cached for 5 minutes
- **Instant navigation**: Previously viewed nodes load instantly from cache
- **Automatic background refreshing**: Stale data is refreshed in the background
- **Reduced server load**: Fewer database queries for repeated data access

**Expected Impact**: 90-95% faster load times for previously visited nodes (from 4-7 seconds to <100ms)

### 2. Intelligent Prefetching Strategy

**What**: Automatically prefetches the first 3 child nodes when a parent node is expanded.

**Implementation**:
- When expanding a site → prefetches first 3 subjects
- When expanding a subject → prefetches first 3 visits  
- When expanding a visit → prefetches first 3 CRFs
- When expanding a CRF → loads field data

**Benefits**:
- **Proactive loading**: Data is ready before the user clicks
- **Parallel requests**: Multiple prefetch requests happen simultaneously
- **Optimized for common patterns**: Users typically expand the top items first
- **Non-blocking**: Prefetching happens in the background without blocking UI

**Expected Impact**: 70-80% faster perceived load times for subsequent expansions

### 3. Dual-Layer Caching Strategy

**What**: Implements two levels of caching for maximum performance.

**Layers**:
1. **React Query Cache** (HTTP layer): Caches server responses with automatic invalidation
2. **Local State Cache** (Component layer): In-memory cache for already-processed hierarchy data

**Benefits**:
- **Redundancy**: If one cache misses, the other may still hit
- **Optimized data structures**: Local cache stores processed hierarchy nodes
- **Fast fallback**: Component cache provides instant access without query overhead

**Expected Impact**: Near-instant (<50ms) load times for any previously viewed data

### 4. Debug Instrumentation

**What**: Added comprehensive logging to measure performance improvements.

**Metrics Tracked**:
- Node toggle start/completion times
- Cache hit/miss ratio
- Server fetch durations
- Total operation time
- Data source (React Query cache vs local cache vs server)

**Log Location**: `c:\Users\reggi\trialetics\.cursor\debug.log`

**Benefits**:
- **Measurable improvements**: Can compare before/after performance
- **Identify bottlenecks**: See exactly where time is spent
- **Validate optimizations**: Confirm caching is working as expected

## Configuration

### React Query Settings

```typescript
{
  staleTime: 5 * 60 * 1000,  // 5 minutes - data stays fresh
  gcTime: 10 * 60 * 1000,    // 10 minutes - data kept in memory
  refetchOnWindowFocus: false, // Don't refetch on tab switch
  retry: 1                     // Retry failed requests once
}
```

### Prefetch Settings

- **Prefetch count**: 3 items per level
- **Prefetch staleTime**: 5 minutes
- **Non-blocking**: Prefetch errors don't affect UX

## Testing the Improvements

### Before Testing

1. Clear browser cache
2. Refresh the page
3. Note: First load will still be slow (cold cache)

### Performance Test Scenarios

**Scenario 1: Cache Hit (Best Case)**
1. Expand a site node → (4-7 seconds expected)
2. Collapse the site
3. Re-expand the same site → **Expected: <100ms from cache**

**Scenario 2: Prefetch Benefit**
1. Expand a site node
2. Immediately expand the first subject → **Expected: <500ms (prefetched)**
3. Expand the second subject → **Expected: <500ms (prefetched)**
4. Expand a random subject → (Normal load time, not prefetched)

**Scenario 3: Navigation Patterns**
1. Expand Site A
2. Expand Subject 1 under Site A
3. Navigate to Site B
4. Return to Site A → **Expected: Instant (cached)**
5. Re-expand Subject 1 → **Expected: Instant (cached)**

### Reading Debug Logs

After testing, check the log file for performance metrics:

```bash
type c:\Users\reggi\trialetics\.cursor\debug.log
```

Key metrics to look for:
- `fetchDuration`: Time spent fetching from server
- `totalDuration`: Total time including UI updates
- `source: 'react-query'`: Data loaded from React Query cache
- `source: 'local'`: Data loaded from local component cache

## Performance Expectations

### Cold Cache (First Load)
- Site expansion: 4-7 seconds (unchanged - database query required)
- Subject expansion: 4-7 seconds (unchanged)
- Visit expansion: 4-7 seconds (unchanged)
- CRF expansion: 4-7 seconds (unchanged)

### Warm Cache (Subsequent Loads)
- Site expansion: **<100ms** (95% improvement)
- Subject expansion: **<100ms** (95% improvement)
- Visit expansion: **<100ms** (95% improvement)
- CRF expansion: **<100ms** (95% improvement)

### With Prefetching (First 3 Items)
- First 3 subjects: **<500ms** (85% improvement)
- First 3 visits: **<500ms** (85% improvement)
- First 3 CRFs: **<500ms** (85% improvement)

## Future Optimizations (Not Implemented)

These were analyzed but not implemented in this iteration:

1. **Materialized Views** - Requires database migration with potential timeout issues
2. **Virtual Scrolling** - Best for very large datasets (1000+ rows)
3. **Parallel Loading** - More complex state management required
4. **Database Indexes** - Requires schema analysis and migration
5. **Table Partitioning** - Advanced database optimization

## Next Steps

If current optimizations are insufficient, consider:

1. **Direct PostgreSQL connection** for materialized view migration
2. **Connection pooling** optimization
3. **Database query optimization** (analyze slow queries)
4. **CDN caching** for static aggregations
5. **Server-side caching** with Redis

## Notes

- All changes are backward compatible
- No database schema changes required
- React Query is production-ready and battle-tested
- Caching respects user filters (different filters = different cache keys)
- Cache automatically invalidates on new uploads
