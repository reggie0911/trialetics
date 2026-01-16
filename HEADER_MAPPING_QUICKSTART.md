# Header Mapping Feature - Quick Start

## Visual Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Patient Data Table                                         │
├─────────────────────────────────────────────────────────────┤
│  [Upload CSV] [Load Header Map] [Columns (45/123)]         │
└─────────────────────────────────────────────────────────────┘
                    ↓                    ↓
            ┌──────────────┐    ┌──────────────┐
            │ Patient Data │    │ Header       │
            │ CSV          │    │ Mapping CSV  │
            └──────────────┘    └──────────────┘
```

## Workflow

### Step 1: Upload Patient Data
```
┌─────────────────────────────┐
│ Upload CSV                  │
│ ┌─────────────────────────┐ │
│ │ patient-data.csv        │ │
│ │ - SubjectId             │ │
│ │ - E01_V1[1].SCR_01...   │ │
│ │ - Hospital ID           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Step 2: Load Header Map
```
┌─────────────────────────────┐
│ Load Header Map             │
│ ┌─────────────────────────┐ │
│ │ Polares Headers.csv     │ │
│ │                         │ │
│ │ Table Order | Visit Grp│ │
│ │ 1 | Patient Info | ...  │ │
│ │ 2 | Patient Info | ...  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Step 3: View Grouped Columns
```
┌────────────────────────────────────┐
│ Column Visibility (Grouped)        │
├────────────────────────────────────┤
│ ☑ Patient Info (21/21)         ▼  │
│   ├─ ☑ Patient ID                  │
│   ├─ ☑ Hospital ID#                │
│   ├─ ☑ Ref #                       │
│   └─ ☑ Age                         │
│                                    │
│ ☑ Screening Visit (13/13)      ▼  │
│   ├─ ☑ Date                        │
│   ├─ ☑ MR Grade                    │
│   ├─ ☑ Mean Gradient (mmHg)        │
│   └─ ☑ LVEF %                      │
│                                    │
│ ☐ Procedure Visit (0/9)        ▶  │
│                                    │
│ ☑ 30 Day Visit (8/9)           ▼  │
│   ├─ ☑ Date                        │
│   ├─ ☐ MR Grade                    │
│   └─ ☑ LVEF %                      │
└────────────────────────────────────┘
```

## Before & After Comparison

### Before (No Header Mapping)
```
┌─────────────────────────────────────────────────┐
│ Table Headers                                   │
├─────────────────────────────────────────────────┤
│ SubjectId                                       │
│ E01_V1[1].SCR_01.VS[1].AGE                     │
│ E01_V1[1].SCR_01.VS[1].SEX                     │
│ E01_V1[1].SCR_02.ECHO[1].LVEFUT                │
│ E01_V1[1].SCR_05.SE[1].MRGRADCD                │
│ Discharge_LVEF %_CA                             │
│ 30-D_LVEDV_CA                                   │
└─────────────────────────────────────────────────┘
```

### After (With Header Mapping)
```
┌─────────────────────────────────────────────────┐
│ Table Headers (Organized by Visit Group)       │
├─────────────────────────────────────────────────┤
│ 📁 Patient Info                                 │
│    Patient ID                                   │
│    Age                                          │
│    Sex                                          │
│                                                 │
│ 📁 Screening Visit                              │
│    LVEF %                                       │
│    MR Grade                                     │
│                                                 │
│ 📁 Procedure Visit                              │
│    LVEF %                                       │
│                                                 │
│ 📁 30 Day Visit                                 │
│    LVEDV                                        │
└─────────────────────────────────────────────────┘
```

## Feature Highlights

### 🎯 Smart Mapping
- Automatically maps technical column names to friendly names
- Example: `E01_V1[1].SCR_01.VS[1].AGE` → `Age`

### 📊 Visit Groups
10 predefined visit groups:
1. Patient Info
2. Screening Visit
3. Procedure Visit
4. 30 Day Visit
5. 3 Month Visit
6. 6 Month Visit
7. 1 Year Visit
8. 2 Year Visit
9. Visit Window
10. Remodeling %

### ⚡ Quick Actions
- Toggle entire visit groups on/off
- Collapse/expand groups
- See column counts per group
- Original names in tooltips

### 🔄 Dynamic Updates
- Changes apply immediately
- Works with any patient data CSV
- Preserves custom edits
- Respects table order

## CSV Format Example

```csv
Table Order,Visit Group,Original Header,Customized Header
1,Patient Info,SubjectId,Patient ID
2,Patient Info,Hospital ID,Hospital ID#
3,Patient Info,E01_V1[1].SCR_05.SE[1].SE_REFID,Ref #
4,Patient Info,E01_V1[1].SCR_01.VS[1].AGE,Age
5,Patient Info,E01_V1[1].SCR_01.VS[1].SEX,Sex
```

## Tips

💡 **Column Order**: The "Table Order" number determines column position  
💡 **Group Order**: Groups are sorted by their first column's order  
💡 **Unmapped Columns**: Will appear in "Other" group  
💡 **Tooltips**: Hover over headers to see original names  
💡 **Editable**: Headers remain editable after mapping  

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Headers not updating | Check "Original Header" matches exactly |
| Groups not showing | Verify "Visit Group" column is filled |
| Wrong order | Check "Table Order" values in CSV |
| Missing columns | Add them to header mapping CSV |

## Next Steps

1. ✅ Upload your patient data CSV
2. ✅ Upload the header mapping CSV
3. ✅ Toggle visibility by visit group
4. ✅ Drag columns to reorder (optional)
5. ✅ Edit individual headers as needed
