# Looping/Compilation Bug Fix

## Problem
The Clinical Trials page was stuck in an infinite compilation/rendering loop, showing "Rendering..." continuously.

## Root Cause
The issue was caused by **all four tabs mounting simultaneously** on page load, each triggering their own server actions to fetch data:

1. **Programs Tab** → `getClinicalPrograms()`
2. **Protocols Tab** → `getClinicalProtocols()`
3. **Regions Tab** → `getClinicalRegions()`
4. **Sites Tab** → `getClinicalSites()`

Additionally, there were two contributing factors:
- **Unstable `toast` dependency**: The `useToast()` function was included in `useCallback` dependencies, potentially causing unnecessary re-renders
- **Unstable `form` dependency**: The React Hook Form `form` object was in the dependency array for the reset `useEffect`

## Solution

### 1. Lazy Tab Loading
Modified `clinical-trials-page-client.tsx` to only render the active tab:

```typescript
<TabsContent value="programs" className="mt-0 h-full">
  {activeTab === 'programs' && (
    <ProgramsTab ... />
  )}
</TabsContent>
```

This ensures:
- Only one tab component mounts at a time
- Only one server action runs on initial page load
- Switching tabs triggers data fetching only for the newly active tab

### 2. Removed Unstable Dependencies
Removed `toast` from all `useCallback` dependencies in:
- `programs-tab.tsx`
- `protocols-tab.tsx`
- `regions-tab.tsx`
- `sites-tab.tsx`

Removed `form` from `useEffect` dependency in:
- `program-form-dialog.tsx`

The `toast` and `form.reset` functions are stable and don't need to be in dependency arrays.

## Files Modified
- `c:/Users/reggi/trialetics/components/clinical-trials/clinical-trials-page-client.tsx`
- `c:/Users/reggi/trialetics/components/clinical-trials/programs-tab.tsx`
- `c:/Users/reggi/trialetics/components/clinical-trials/protocols-tab.tsx`
- `c:/Users/reggi/trialetics/components/clinical-trials/regions-tab.tsx`
- `c:/Users/reggi/trialetics/components/clinical-trials/sites-tab.tsx`
- `c:/Users/reggi/trialetics/components/clinical-trials/program-form-dialog.tsx`

## Testing
The page should now:
1. Load quickly without compilation loops
2. Show only the Programs tab data on initial load
3. Fetch Protocols/Regions/Sites data only when those tabs are clicked
4. Maintain stable rendering without infinite loops

## Performance Impact
- **Before**: 4 simultaneous server actions on page load
- **After**: 1 server action on page load, additional actions on-demand when switching tabs
- **Reduction**: 75% fewer initial API calls
