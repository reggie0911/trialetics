# CSV Header Mapping & Grouped Column Organization

This feature allows you to import a CSV file that defines custom header names and organizes columns by visit groups.

## Overview

The system now supports:
- ✅ **Header mapping from CSV**: Import a CSV file to rename columns
- ✅ **Visit group organization**: Group columns by visit type (Patient Info, Screening Visit, etc.)
- ✅ **Grouped column visibility**: Toggle entire visit groups on/off
- ✅ **Collapsible groups**: Expand/collapse visit groups in the column selector
- ✅ **Preserved table order**: Columns maintain their defined order from the CSV

## How to Use

### 1. Upload Patient Data
First, upload your patient data CSV as usual using the "Upload CSV" button.

### 2. Load Header Mapping
Click the **"Load Header Map"** button and upload your header mapping CSV file.

### Header Mapping CSV Format
The CSV should have the following columns:

```csv
Table Order,Visit Group,Original Header,Customized Header
1,Patient Info,SubjectId,Patient ID
2,Patient Info,Hospital ID,Hospital ID#
3,Patient Info,E01_V1[1].SCR_05.SE[1].SE_REFID,Ref #
...
```

#### Column Definitions:
- **Table Order**: Numeric order for sorting (1, 2, 3...)
- **Visit Group**: Group name (Patient Info, Screening Visit, Procedure Visit, etc.)
- **Original Header**: The exact column name from your patient data CSV
- **Customized Header**: The display name you want to show in the table

### 3. View Grouped Columns
After loading the header map, the "Columns" button will change to show visit groups:
- Click to open the grouped column visibility dialog
- Expand/collapse groups using the chevron icon
- Toggle entire groups on/off using the group checkbox
- Toggle individual columns within each group

### 4. Features

#### Visit Group Organization
Columns are automatically organized into groups:
- Patient Info
- Screening Visit
- Procedure Visit
- 30 Day Visit
- 3 Month Visit
- 6 Month Visit
- 1 Year Visit
- 2 Year Visit
- Visit Window
- Remodeling %
- Other (for unmapped columns)

#### Custom Header Names
The table will display customized header names instead of technical column IDs:
- Original: `E01_V1[1].SCR_01.VS[1].AGE`
- Customized: `Age`

The original header name is still accessible via tooltip when hovering over the editable header.

#### Group-Level Controls
- **Show/Hide Groups**: Toggle entire visit groups on or off
- **Group Status**: See how many columns are visible in each group
- **Collapse/Expand**: Collapse groups you're not currently working with

## File Structure

### New Files Created
```
lib/utils/header-mapper.ts          # CSV parsing and header mapping utilities
components/patients/
  ├── header-mapping-upload.tsx     # Upload dialog for header mapping CSV
  └── grouped-column-visibility.tsx # Grouped column visibility component
```

### Modified Files
```
lib/types/patient-data.ts           # Added visitGroup and tableOrder to ColumnConfig
components/patients/
  └── patients-page-client.tsx      # Integrated header mapping functionality
```

## API Reference

### `parseHeaderMappingCSV(csvContent: string): HeaderMapping[]`
Parses a CSV string into header mapping objects.

### `createHeaderLookup(mappings: HeaderMapping[]): Map<string, string>`
Creates a lookup map from original headers to customized headers.

### `getVisitGroupForColumn(columnId: string, mappings: HeaderMapping[]): string`
Returns the visit group for a given column ID.

### `groupHeadersByVisit(mappings: HeaderMapping[]): GroupedHeaders`
Groups header mappings by visit group.

### `getVisitGroupOrder(mappings: HeaderMapping[]): string[]`
Returns visit groups in their defined order.

## Example Header Mapping CSV

See the example file: `Polares Headers_16Jan2026.csv`

This file contains 123 header mappings across 10 visit groups.

## Troubleshooting

### Headers Not Updating
- Ensure the "Original Header" in your CSV exactly matches the column name in your patient data
- Check for extra spaces or special characters
- Original headers are case-sensitive

### Visit Groups Not Showing
- Verify that the "Visit Group" column is filled in for all rows
- Check that the CSV is properly formatted (commas separating columns)
- Ensure you've loaded both the patient data CSV and the header mapping CSV

### Columns Missing
- Check that your header mapping CSV includes all the columns you want to display
- Unmapped columns will appear in the "Other" group
- Use the column visibility toggle to show/hide specific columns

## Advanced Usage

### Custom Visit Groups
You can define any visit group names in your CSV. The system will automatically:
- Create sections for each unique visit group
- Sort groups by the lowest table order number in that group
- Display groups in a collapsible format

### Reordering Columns
Columns are ordered by the "Table Order" value in your CSV:
- Within a group, columns are sorted by their table order
- Groups themselves are sorted by their first column's table order
- You can still manually drag columns after they're loaded

### Editing Headers
Even with a header mapping loaded, you can still:
- Click on any header to edit it inline
- View the original header name in the tooltip
- Changes are temporary (not saved to the CSV)

## Benefits

1. **Consistency**: Use standardized display names across all data views
2. **Organization**: Quickly navigate large datasets by visit group
3. **Flexibility**: Load different header mappings for different studies
4. **Traceability**: Original headers are always visible via tooltips
5. **Efficiency**: Toggle entire visit groups instead of individual columns
