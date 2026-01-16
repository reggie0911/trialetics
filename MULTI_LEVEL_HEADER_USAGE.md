# Multi-level Header Table - Usage Guide

## Important: Upload Order

To see the new multi-level header format, you must follow this sequence:

### Step 1: Upload Header Mapping CSV
1. Click the **"Load Header Map"** button
2. Select your header mapping file: `Polares Headers_16Jan2026_B.csv`
3. This defines:
   - Column structure and order
   - Visit group organization
   - Custom column names

### Step 2: Upload Patient Data CSV
1. Click the **"Upload CSV"** button
2. Select your patient data file
3. The table will now display with:
   - **Top row**: Visit group headers (merged/spanning multiple columns)
   - **Bottom row**: Individual column names (customized names from the mapping)

## What You'll See

### Without Header Mapping
If you upload patient data WITHOUT first loading the header mapping:
- Single row of headers (no visit groups)
- Original column names from the data
- Standard flat table structure

### With Header Mapping (Correct Flow)
If you load header mapping FIRST, then upload patient data:
- **Two-row header structure**
- Top row: `Patient Info | Screening Visit | Procedure Visit | ...`
- Bottom row: `Patient ID | Age | Sex | Date | MR Grade | ...`
- Columns organized and sorted by table order
- Visit groups span the correct number of columns

## If You Already Uploaded Data

If you already uploaded patient data before the header mapping:
1. Click **"Load Header Map"** now
2. The table will automatically update with the multi-level header format
3. Columns will be reordered and grouped according to the mapping

## Expected Table Structure

```
|        Patient Info         |  Screening Visit  | Procedure Visit |
|-----------+-----+------------|------+-----------|------+----------|
| Patient ID| Age | Hospital   | Date | MR Grade  | Date | MrAce    |
|           |     | ID#        |      |           |      | size     |
|-----------+-----+------------|------+-----------|------+----------|
| 202302... | 58  | 13240650   | 9/15 | 4         | 11/1 | 26mm     |
```

## Troubleshooting

### "I don't see multi-level headers"
- ✅ Make sure you loaded the header mapping CSV first
- ✅ Check that the CSV format is correct (transposed format with 4 rows)
- ✅ Verify the file uploaded successfully (check for upload confirmation)

### "Columns are not grouped"
- ✅ Ensure your header mapping CSV has the "Visit Group" row filled in
- ✅ Check that column names in your data match "Original Header" in the mapping

### "Table is empty"
- This is expected! The table starts empty.
- Upload your header mapping CSV first, then patient data CSV

## CSV Format Reference

Your header mapping CSV should be in this transposed format:

```csv
Table Order,1,2,3,4,5,...
Visit Group,Patient Info,Patient Info,Patient Info,Screening Visit,...
Original Header,SubjectId,Hospital ID,E01_V1[1].SCR_05.SE[1].SE_REFID,...
Customized Header,Patient ID,Hospital ID#,Ref #,...
```

- **Row 1**: Numbers defining column order (not displayed in table)
- **Row 2**: Visit group names (displayed as merged headers)
- **Row 3**: Original technical column names (matched to data)
- **Row 4**: User-friendly display names (shown in table)

## Features Still Work

All existing features remain functional:
- ✅ Drag-and-drop column reordering
- ✅ Inline header editing
- ✅ Column sorting (click arrows)
- ✅ Column visibility toggle by group
- ✅ Filters and search
- ✅ Sticky first column
- ✅ Scroll shadows

## Files Needed

1. **Header Mapping CSV**: `Polares Headers_16Jan2026_B.csv`
   - Defines table structure
   - Should be uploaded FIRST

2. **Patient Data CSV**: Your actual patient data
   - Contains rows of patient records
   - Column headers must match "Original Header" from mapping
   - Upload AFTER header mapping for best results
