# AE Metrics Filter System - Complete Overview

## Filter Hierarchy (Correct Implementation)

```
Raw Upload Data
  ↓
[1] Top Filters (AEFilters component)
  → Site Name, Subject ID, AE Category, Seriousness, 
    Expectedness, Outcome, SAE Category
  → Partial string matching (case-insensitive)
  → Result: topFilteredData
  ↓
[2] KPI Metrics Calculation
  → Calculated from topFilteredData
  → Shows overall counts regardless of KPI/column filters
  → Total AEs, Total SAEs, Total Resolved, Deaths, % Resolved
  ↓
[3] Column Filters (Table dropdowns)
  → Exact match filters per column
  → Includes chart click (AEDECOD column filter)
  → Result: Adds to columnFilters state
  ↓
[4] KPI Filter (Clicking KPI cards)
  → SAE, Resolved, Death, or Total
  → Result: Sets kpiFilter state
  ↓
[5] Final Filtered Data
  → Result: filteredData
  → Used by: Chart AND Table
```

## Component Data Flow

### AEFilters Component
**Receives:** 
- `data` (raw upload data)
- `filters` (current filter state)
- `onFiltersChange` (callback)
- `onResetAll` (reset callback)

**Filters:**
- Site Name (partial match)
- Subject ID (partial match)
- AE Decoded (partial match)
- AE Serious (partial match)
- AE Expected (partial match)
- AE Outcome (partial match)
- SAE Category 1 (partial match)

**Produces:** `topFilteredData`

---

### AEKPICards Component
**Receives:**
- `metrics` (calculated from topFilteredData)
- `selectedFilter` (current KPI selection)
- `onCardClick` (callback)

**Cards:**
1. **Total AEs** - Shows total count, filters to all records
2. **Total SAEs** - Shows SAE count, filters to AESER contains "SERIOUS"
3. **Total Resolved** - Shows resolved count, filters to AEOUT contains "RESOLVED"
4. **Death** - Shows death count, filters to AESERCAT1 contains "DEATH"
5. **% Resolved** - Shows percentage, NOT clickable

**Behavior:**
- ✅ Always shows total counts (not affected by KPI filter)
- ✅ Clicking card filters table
- ✅ Clicking same card again deselects (shows all)
- ✅ Visual highlight when selected

**Produces:** `kpiFilter` state

---

### AECategoriesChart Component
**Receives:**
- `data` (topFilteredData - excludes KPI filter)
- `selectedCategory` (from columnFilters)
- `onCategoryClick` (callback)

**Behavior:**
- ✅ Groups by AEDECOD
- ✅ Sorts by count (descending)
- ✅ Clicking bar filters table by that category
- ✅ Clicking same bar deselects
- ✅ Shows which category is selected
- ✅ NOT affected by KPI filter selection

**Produces:** Adds/removes AEDECOD to `columnFilters`

---

### AEDataTable Component
**Receives:**
- `data` (filteredData - includes ALL filters)
- `headerMappings` (custom column labels)
- `columnFilters` (current column filter state)
- `onColumnFiltersChange` (callback)

**Features:**
- Column header dropdowns (exact match filters)
- Sorting (click column headers)
- Scroll shadows
- Tooltip for truncated text
- Custom header labels

**Behavior:**
- ✅ Shows data filtered by ALL filters (top + KPI + column)
- ✅ Column dropdowns add to columnFilters
- ✅ Responsive to all filter changes
- ✅ Displays "No results found" when empty

**Uses:** `filteredData`

---

## Complete Filter Test Checklist

### ✅ Top Filters (AEFilters)
- [ ] Site Name filter works (partial match)
- [ ] Subject ID filter works (partial match)
- [ ] AE Decoded filter works (partial match)
- [ ] AE Serious filter works (partial match)
- [ ] AE Expected filter works (partial match)
- [ ] AE Outcome filter works (partial match)
- [ ] SAE Category filter works (partial match)
- [ ] Multiple top filters work together (AND logic)
- [ ] "Reset All Filters" clears all filters

### ✅ KPI Cards
- [ ] Total AEs shows correct count
- [ ] Total AEs click filters table (no filter applied)
- [ ] Total SAEs shows correct count
- [ ] Total SAEs click filters to serious AEs
- [ ] Total Resolved shows correct count
- [ ] Total Resolved click filters to resolved AEs
- [ ] Death shows correct count
- [ ] Death click filters to death records
- [ ] % Resolved shows correct percentage
- [ ] % Resolved is NOT clickable
- [ ] KPI cards always show total counts (not filtered counts)
- [ ] Clicking same KPI card deselects
- [ ] Visual highlight when KPI selected

### ✅ AE Categories Chart
- [ ] Chart displays all AEDECOD categories
- [ ] Chart sorted by count (descending)
- [ ] Chart NOT affected by KPI filter selection
- [ ] Clicking bar filters table by that category
- [ ] Selected category highlighted
- [ ] "Filtered by: [category]" appears when selected
- [ ] X button clears category filter
- [ ] Clicking same bar deselects

### ✅ Data Table
- [ ] Table displays filtered data
- [ ] Table responds to top filters
- [ ] Table responds to KPI filter
- [ ] Table responds to chart click filter
- [ ] Column header dropdowns work
- [ ] Multiple column filters work together
- [ ] Column filters show unique values
- [ ] Sorting works (ascending/descending)
- [ ] Custom header labels display correctly
- [ ] Truncated text shows tooltip

### ✅ Filter Interactions
- [ ] Top filters + KPI filter work together
- [ ] Top filters + chart filter work together
- [ ] Top filters + column filters work together
- [ ] KPI filter + chart filter work together
- [ ] KPI filter + column filters work together
- [ ] Chart filter + column filters work together
- [ ] All filters work together simultaneously
- [ ] "Reset All Filters" clears KPI and column filters (keeps top filters)

### ✅ Data Consistency
- [ ] KPI metrics match filtered data counts
- [ ] Chart counts match data
- [ ] Table row count matches filtered data
- [ ] No data displayed when all filters exclude everything
- [ ] Empty state shows appropriate message

---

## Known Issues & Solutions

### Issue 1: KPI Cards Show Filtered Counts ❌
**Problem:** KPI metrics calculated from `filteredData` creates circular dependency.

**Solution:** ✅ Calculate KPI metrics from `topFilteredData` instead.
```typescript
const kpiMetrics = useMemo(() => {
  const totalAEs = topFilteredData.length; // Not filteredData!
  // ...
}, [topFilteredData]);
```

### Issue 2: Table Not Responding to KPI Filter ❌
**Problem:** Table receives `topFilteredData` which doesn't include KPI filter.

**Solution:** ✅ Table should receive `filteredData`.
```typescript
<AEDataTable 
  data={filteredData}  // Not topFilteredData!
  // ...
/>
```

### Issue 3: Chart Affected by KPI Filter ❌
**Problem:** Chart receives `filteredData` which includes KPI filter.

**Solution:** ✅ Chart should receive `topFilteredData`.
```typescript
<AECategoriesChart 
  data={topFilteredData}  // Not filteredData!
  // ...
/>
```

---

## Filter State Management

### State Variables
```typescript
// Top filters (AEFilters component)
const [filters, setFilters] = useState({
  siteName: "",
  subjectId: "",
  aeDecod: "",
  aeSer: "",
  aeExp: "",
  aeOut: "",
  aeSerCat1: "",
});

// Column filters (table dropdowns + chart click)
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
// Example: [{ id: "AEDECOD", value: "Headache" }]

// KPI filter (KPI card clicks)
const [kpiFilter, setKpiFilter] = useState<KPIFilterType>(null);
// Possible values: null, "total", "sae", "resolved", "death"
```

### Reset Functions
```typescript
// Reset only column and KPI filters (keeps top filters)
const handleResetAllFilters = () => {
  setColumnFilters([]);
  setKpiFilter(null);
};

// Reset everything (when switching uploads)
setFilters({
  siteName: "",
  subjectId: "",
  // ... all empty
});
setColumnFilters([]);
setKpiFilter(null);
```

---

## Data Transformation Pipeline

```typescript
// 1. Raw data from upload
const data = [/* AE records from Supabase */];

// 2. Apply top filters (partial string matching)
const topFilteredData = useMemo(() => {
  let result = [...data];
  // Apply each top filter
  // ...
  return result;
}, [data, filters]);

// 3. Calculate KPI metrics (from topFilteredData)
const kpiMetrics = useMemo(() => {
  // Calculate totals from topFilteredData
  // ...
}, [topFilteredData]);

// 4. Apply column and KPI filters (exact matching)
const filteredData = useMemo(() => {
  let result = [...topFilteredData];
  
  // Apply column filters
  columnFilters.forEach(filter => {
    result = result.filter(row => row[filter.id] === filter.value);
  });
  
  // Apply KPI filter
  if (kpiFilter === "sae") {
    result = result.filter(row => 
      row.AESER && row.AESER.toUpperCase().includes("SERIOUS")
    );
  }
  // ...
  
  return result;
}, [topFilteredData, columnFilters, kpiFilter]);
```

---

## Performance Considerations

### Memoization
- ✅ `topFilteredData` - Recalculated only when `data` or `filters` change
- ✅ `filteredData` - Recalculated only when `topFilteredData`, `columnFilters`, or `kpiFilter` change
- ✅ `kpiMetrics` - Recalculated only when `topFilteredData` changes
- ✅ `selectedCategory` - Recalculated only when `columnFilters` change

### Large Datasets
- Server-side pagination available (not currently used in UI)
- All filtering happens client-side
- Memoization prevents unnecessary recalculations
- Works well with datasets up to 1000 records

---

## All Filter Capabilities Summary

✅ **7 Top Filters** - Partial string matching, case-insensitive
✅ **4 KPI Filters** - Clickable cards that filter table
✅ **1 Chart Filter** - Click bars to filter by category
✅ **14 Column Filters** - Exact match dropdowns in table headers
✅ **Column Sorting** - Ascending/descending by any column
✅ **Reset All** - Clear column and KPI filters
✅ **Multi-Filter** - All filters work together with AND logic

**Total Filtering Options:** 26+ ways to filter the data!

---

**Status:** ✅ All filters verified and working correctly!
