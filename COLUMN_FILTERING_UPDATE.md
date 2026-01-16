# Column Filtering Update

## Change Summary

Updated the patient data upload handler to **only import columns that exist in the header mapping CSV**.

## What Changed

### File: `components/patients/patients-page-client.tsx`

**Before:**
- All columns from patient data CSV were imported
- Extra columns not in header mapping were included with visitGroup = "Other"

**After:**
- Patient data is filtered to only include columns that match "Original Header" in the header mapping
- Extra columns in the patient data are completely excluded from the table
- Only the 124 columns defined in the header mapping CSV will be imported

## How It Works

```typescript
// If header mappings exist, filter data
if (headerMappings.length > 0 && newData.length > 0) {
  const validColumnNames = new Set(headerMappings.map(m => m.originalHeader));
  
  // Filter each record to only include mapped columns
  filteredData = newData.map(record => {
    const filteredRecord: PatientRecord = {};
    Object.keys(record).forEach(key => {
      if (validColumnNames.has(key)) {
        filteredRecord[key] = record[key];
      }
    });
    return filteredRecord;
  });
}
```

## Behavior

### With Header Mapping Loaded

**Input Patient Data CSV:**
```csv
SubjectId,Hospital ID,ExtraColumn1,E01_V1[1].SCR_05.SE[1].SE_REFID,UnmappedColumn
202302-010-065,13240650,SomeData,BR27,MoreData
```

**Result:**
- ✅ `SubjectId` → imported (in mapping)
- ✅ `Hospital ID` → imported (in mapping)
- ❌ `ExtraColumn1` → **excluded** (not in mapping)
- ✅ `E01_V1[1].SCR_05.SE[1].SE_REFID` → imported (in mapping)
- ❌ `UnmappedColumn` → **excluded** (not in mapping)

Only the columns that match the "Original Header" row in your `Polares Headers_16Jan2026_B.csv` will be imported.

### Without Header Mapping Loaded

If no header mapping is loaded, all columns from the patient data are imported (original behavior for backward compatibility).

## Benefits

1. **Cleaner tables**: Only shows the 124 defined columns
2. **Consistent structure**: Every import has the same columns
3. **No "Other" group clutter**: Unmapped columns don't appear
4. **Exact match to specification**: Table structure matches the header mapping CSV exactly

## Example

Your header mapping CSV defines 124 columns across 10 visit groups:
- Patient Info (21 columns)
- Screening Visit (13 columns)
- Procedure Visit (20 columns)
- 30 Day Visit (13 columns)
- 3 Month Visit (14 columns)
- 6 Month Visit (13 columns)
- 1 Year Visit (13 columns)
- 2 Year Visit (13 columns)
- Visit Window (2 columns)
- Remodeling % (2 columns)

**Total: 124 columns**

When you upload patient data:
- If data has 150 columns → Only the 124 mapped columns are imported
- If data has 100 columns → Only the matching ones are imported (missing columns show as empty)
- If data has exactly 124 matching columns → All are imported

## No Linter Errors

All changes compile successfully. ✅
