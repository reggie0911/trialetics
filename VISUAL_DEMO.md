# CSV Header Mapping Feature - Visual Demo

## 🎯 What Problem Does This Solve?

### The Problem
Your patient data CSV has technical column names like:
```
E01_V1[1].SCR_01.VS[1].AGE
E01_V1[1].SCR_02.ECHO[1].LVEFUT
Discharge_LVEF %_CA
30-D_LVEDV_CA
```

These are:
- ❌ Hard to read
- ❌ Hard to remember
- ❌ Not organized
- ❌ Not user-friendly

### The Solution
Load a CSV mapping file that transforms them into:
```
Age
LVEF %
LVEF %
LVEDV
```

And organizes them by visit:
```
📁 Patient Info
   └─ Age
📁 Screening Visit
   └─ LVEF %
📁 Procedure Visit
   └─ LVEF %
📁 30 Day Visit
   └─ LVEDV
```

---

## 📋 Example: Your CSV File

### Input: Polares Headers_16Jan2026.csv

```csv
Table Order,Visit Group,Original Header,Customized Header
1,Patient Info,SubjectId,Patient ID
2,Patient Info,Hospital ID,Hospital ID#
3,Patient Info,E01_V1[1].SCR_05.SE[1].SE_REFID,Ref #
4,Patient Info,E01_V1[1].SCR_01.VS[1].AGE,Age
5,Patient Info,E01_V1[1].SCR_01.VS[1].SEX,Sex
6,Patient Info,E01_V1[1].SCR_02.QSRISK[1].STS_QSORRES,STS
7,Patient Info,BMI,BMI
8,Patient Info,BSA,BSA
23,Screening Visit,E01_V1[1]..DATE,Date
24,Screening Visit,E01_V1[1].SCR_05.SE[1].MRGRADCD,MR Grade
25,Screening Visit,E01_V1[1].SCR_05.SE[1].SE_MG,Mean Gradient (mmHg)
26,Screening Visit,E01_V1[1].SCR_02.ECHO[1].LVEFUT,LVEF %
36,Procedure Visit,E02_V2[1].PRO_01.PEP[1].PEPDAT,Date
37,Procedure Visit,E02_V2[1].PRO_09.SE[1].SE_MRSIZE,MrAce size
38,Procedure Visit,E02_V2[1].PRO_09.SE[1].MRGRADCD,MR Grade
```

---

## 🖥️ User Interface Flow

### Step 1: Initial State (No Mapping)

```
┌─────────────────────────────────────────────────────────┐
│ Patient Data Table                                      │
├─────────────────────────────────────────────────────────┤
│ [Upload CSV] [Columns (85/85)]                         │
└─────────────────────────────────────────────────────────┘

Table Headers:
┌─────────────────────────────────────────────────────────┐
│ SubjectId │ E01_V1[1].SCR_01.VS[1].AGE │ Hospital ID │ │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Load Header Map Button Appears

```
┌─────────────────────────────────────────────────────────┐
│ Patient Data Table                                      │
├─────────────────────────────────────────────────────────┤
│ [Upload CSV] [Load Header Map] [Columns (85/85)]      │
│                       ↑                                 │
│                  NEW BUTTON                            │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Upload Header Mapping CSV

```
┌────────────────────────────────────┐
│ Upload Header Mapping CSV          │
├────────────────────────────────────┤
│                                    │
│         📄 Drag and Drop           │
│        Your CSV File Here          │
│                                    │
│         [Browse Files]             │
│                                    │
└────────────────────────────────────┘
```

### Step 4: Headers Transform!

```
┌─────────────────────────────────────────────────────────┐
│ Patient Data Table                                      │
├─────────────────────────────────────────────────────────┤
│ [Upload CSV] [Loaded: Polares...] [Columns (85/85)]   │
└─────────────────────────────────────────────────────────┘

Table Headers (Transformed):
┌─────────────────────────────────────────────────────────┐
│ Patient ID │ Age │ Hospital ID# │ Sex │ BMI │ ...      │
└─────────────────────────────────────────────────────────┘
            ↑         ↑                ↑
    Instead of:  SubjectId  E01_V1[1]...  SEX
```

### Step 5: Grouped Column Visibility

Click "Columns" button to see:

```
┌──────────────────────────────────────────────┐
│ Column Visibility (Grouped by Visit)        │
├──────────────────────────────────────────────┤
│                                              │
│ ☑ Patient Info (21/21)                  [▼] │
│   ┌────────────────────────────────────────┐│
│   │ ☑ Patient ID                          ││
│   │   Original: SubjectId                 ││
│   │                                        ││
│   │ ☑ Hospital ID#                        ││
│   │   Original: Hospital ID               ││
│   │                                        ││
│   │ ☑ Ref #                               ││
│   │   Original: E01_V1[1].SCR_05...       ││
│   │                                        ││
│   │ ☑ Age                                 ││
│   │   Original: E01_V1[1].SCR_01.VS...    ││
│   │                                        ││
│   │ ☑ Sex                                 ││
│   │ ☑ STS                                 ││
│   │ ... (15 more)                         ││
│   └────────────────────────────────────────┘│
│                                              │
│ ☑ Screening Visit (13/13)               [▼] │
│   ┌────────────────────────────────────────┐│
│   │ ☑ Date                                ││
│   │ ☑ MR Grade                            ││
│   │ ☑ Mean Gradient (mmHg)                ││
│   │ ☑ LVEF %                              ││
│   │ ... (9 more)                          ││
│   └────────────────────────────────────────┘│
│                                              │
│ ☐ Procedure Visit (0/9)                 [▶] │
│                                              │
│ ☑ 30 Day Visit (9/9)                    [▼] │
│   ┌────────────────────────────────────────┐│
│   │ ☑ Date                                ││
│   │ ☑ MR Grade                            ││
│   │ ☑ Mean Gradient (mmHg)                ││
│   │ ... (6 more)                          ││
│   └────────────────────────────────────────┘│
│                                              │
│ ☑ 3 Month Visit (9/9)                   [▼] │
│ ☑ 6 Month Visit (9/9)                   [▼] │
│ ☑ 1 Year Visit (9/9)                    [▼] │
│ ☑ 2 Year Visit (9/9)                    [▼] │
│ ☑ Visit Window (2/2)                    [▼] │
│ ☑ Remodeling % (2/2)                    [▼] │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🎬 Animation Flow

```
Before:
┌─────────────────────────────────────────────────────┐
│ SubjectId │ E01_V1[1].SCR_01... │ Hospital ID │... │
└─────────────────────────────────────────────────────┘

        ⬇️  [Load Header Map] + CSV Upload
        
After:
┌─────────────────────────────────────────────────────┐
│ Patient ID │ Age │ Hospital ID# │ Sex │ BMI │ ...  │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Interaction Examples

### Example 1: Hide Entire Visit Group

**Action**: Uncheck "Procedure Visit" group checkbox

**Before**:
```
Patient ID | Age | Date | MrAce size | MR Grade | Date | ...
           Patient Info  Procedure Visit        30 Day Visit
```

**After**:
```
Patient ID | Age | Date | ...
           Patient Info  30 Day Visit
```

### Example 2: Collapse Group

**Action**: Click chevron to collapse "Screening Visit"

**Before**:
```
☑ Screening Visit (13/13)                          [▼]
  ├─ ☑ Date
  ├─ ☑ MR Grade
  ├─ ☑ Mean Gradient (mmHg)
  └─ ... (10 more)
```

**After**:
```
☑ Screening Visit (13/13)                          [▶]
```

### Example 3: Toggle Individual Column

**Action**: Uncheck "BMI" within Patient Info

**Result**:
```
☑ Patient Info (20/21)                             [▼]
  ├─ ☑ Patient ID
  ├─ ☑ Age
  ├─ ☐ BMI  ← Unchecked
  └─ ☑ Sex
```

Table updates to hide BMI column.

---

## 📊 Data Structure

### HeaderMapping Interface
```typescript
interface HeaderMapping {
  tableOrder: number;        // 1, 2, 3, ...
  visitGroup: string;        // "Patient Info", "Screening Visit"
  originalHeader: string;    // "E01_V1[1].SCR_01.VS[1].AGE"
  customizedHeader: string;  // "Age"
}
```

### Example Mapping Object
```typescript
{
  tableOrder: 4,
  visitGroup: "Patient Info",
  originalHeader: "E01_V1[1].SCR_01.VS[1].AGE",
  customizedHeader: "Age"
}
```

---

## 🔄 Processing Pipeline

```
┌──────────────────┐
│ CSV File Upload  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Parse CSV Text   │
│ Split by lines   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Parse Each Row   │
│ Handle quotes    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Create Mappings  │
│ Array            │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Build Lookup Map │
│ Original→Custom  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Update Column    │
│ Configs          │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Group by Visit   │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Render Grouped   │
│ UI               │
└──────────────────┘
```

---

## 💡 Pro Tips

### Tip 1: Quick Group Toggle
Click the group checkbox to show/hide all columns in that visit at once.

### Tip 2: Original Name Reference
Hover over any header to see the original technical name in a tooltip.

### Tip 3: Maintain Order
The "Table Order" number in your CSV controls the display order.

### Tip 4: Add New Columns
Just add a new row to your header mapping CSV and re-upload.

### Tip 5: Multiple Mappings
Create different CSV files for different studies or data exports.

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ "Load Header Map" button appears
2. ✅ After upload, button shows "Loaded: [filename]"
3. ✅ Table headers change to friendly names
4. ✅ "Columns" dialog shows visit groups
5. ✅ Groups are collapsible
6. ✅ Column counts shown per group

---

## 🚀 Quick Test

1. Go to Patient Data Table page
2. Click "Upload CSV" → select patient data
3. Click "Load Header Map" → select `Polares Headers_16Jan2026.csv`
4. Observe headers transform
5. Click "Columns" → see grouped view
6. Toggle "Procedure Visit" off
7. See those columns disappear from table
8. Toggle back on
9. ✅ Success!

---

## 📝 CSV Template

Create your own header mapping CSV:

```csv
Table Order,Visit Group,Original Header,Customized Header
1,Patient Info,SubjectId,Patient ID
2,Patient Info,patient_age,Age
3,Baseline Visit,baseline_date,Date
4,Baseline Visit,baseline_weight_kg,Weight (kg)
5,Follow-up Visit,followup_date,Date
6,Follow-up Visit,followup_weight_kg,Weight (kg)
```

Rules:
- First row is header (required)
- Table Order = numeric, determines sort
- Visit Group = any text, creates group
- Original Header = exact match to your data column
- Customized Header = display name you want

---

That's it! You now have a fully functional CSV header mapping and grouping system. 🎉
