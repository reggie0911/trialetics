# Patient Data Tracker - Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    /protected/patients/page.tsx                  │
│                    (Server Component with Auth)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ProtectedNavbar                             │
│              (Reused from existing components)                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PatientsPageClient.tsx                        │
│               (Main Client Component - State Hub)                │
│                                                                  │
│  State Management:                                               │
│  • data: PatientRecord[]                                        │
│  • columnConfigs: ColumnConfig[]                                │
│  • filters: FilterState                                         │
│  • uploadInfo: { fileName, uploadedAt }                         │
│                                                                  │
└───┬──────────────┬──────────────┬──────────────┬────────────────┘
    │              │              │              │
    ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ Patients │ │   CSV    │ │ Patient  │ │ Column Visibility│
│  Navbar  │ │  Upload  │ │ Filters  │ │     Toggle       │
└──────────┘ └──────────┘ └──────────┘ └──────────────────┘
                   │              │
                   ▼              ▼
              ┌──────────────────────┐
              │   Dialog with:       │
              │   • File Input       │
              │   • Drag & Drop      │
              │   • Preview Table    │
              │   • PapaParse        │
              └──────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────────────┐
                   │      PatientDataTable.tsx       │
                   │   (Main Data Display)           │
                   │                                 │
                   │  Features:                      │
                   │  • Horizontal scroll            │
                   │  • Sticky columns/headers       │
                   │  • Scroll shadows               │
                   │  • Color coding                 │
                   │  • Tooltips                     │
                   │                                 │
                   └────────────┬────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────────────┐
                   │   EditableTableHeader.tsx       │
                   │   (Per Column Header)           │
                   │                                 │
                   │  Features:                      │
                   │  • Inline editing               │
                   │  • Hover to edit                │
                   │  • Keyboard controls            │
                   │  • Original label tooltip       │
                   │                                 │
                   └─────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│  CSV File    │
└──────┬───────┘
       │
       │ User uploads
       ▼
┌──────────────────┐
│   PapaParse      │
│   (CSV Parser)   │
└──────┬───────────┘
       │
       │ Parses to JSON
       ▼
┌──────────────────────────┐
│  PatientRecord[]         │
│  (Type-safe data)        │
└──────┬───────────────────┘
       │
       │ Sets state
       ▼
┌───────────────────────────┐
│ PatientsPageClient        │
│ • data                    │
│ • columnConfigs           │
│ • filters                 │
└──┬────────────────┬───────┘
   │                │
   │ Filtered       │ Config
   ▼                ▼
┌──────────────┐ ┌──────────────┐
│   Display    │ │   Column     │
│   in Table   │ │   Controls   │
└──────────────┘ └──────────────┘
```

## Filter Flow

```
┌─────────────────────┐
│  User Input         │
│  • Global search    │
│  • Column filters   │
│  • Quick chips      │
└──────────┬──────────┘
           │
           │ Updates FilterState
           ▼
┌─────────────────────────────┐
│  PatientsPageClient         │
│  useMemo(() => {            │
│    • Apply global search    │
│    • Apply column filters   │
│    • Return filtered data   │
│  }, [data, filters])        │
└──────────┬──────────────────┘
           │
           │ Pass filtered data
           ▼
┌─────────────────────────────┐
│  PatientDataTable           │
│  Renders filtered rows      │
└─────────────────────────────┘
```

## Column Configuration Flow

```
┌──────────────────────┐
│  Data Upload/Load    │
└──────────┬───────────┘
           │
           │ Extract column names
           ▼
┌─────────────────────────────┐
│  getColumnConfigurations()  │
│  • Auto-categorize          │
│  • Determine data types     │
│  • Create friendly labels   │
└──────────┬──────────────────┘
           │
           │ Generate ColumnConfig[]
           ▼
┌─────────────────────────────┐
│  PatientsPageClient         │
│  columnConfigs state        │
└──┬────────────┬─────────────┘
   │            │
   │ Edit       │ Visibility
   ▼            ▼
┌─────────┐ ┌──────────────┐
│ Headers │ │ Toggle Dialog│
└─────────┘ └──────────────┘
```

## Component Communication

```
PatientsPageClient (Parent)
│
├─ onUpload(data, fileName)
│   └─> CSVUploadDialog
│       ↓ Triggers state update
│       └─> Re-renders table
│
├─ onColumnLabelChange(columnId, newLabel)
│   └─> EditableTableHeader
│       ↓ Updates columnConfigs
│       └─> Header displays new label
│
├─ onColumnsChange(newColumns)
│   └─> ColumnVisibilityToggle
│       ↓ Updates columnConfigs.visible
│       └─> Table shows/hides columns
│
└─ onFiltersChange(newFilters)
    └─> PatientFilters
        ↓ Updates filters state
        └─> Triggers useMemo
            └─> Table shows filtered data
```

## State Management Strategy

**Why Local State?**
- Single page feature
- No cross-page data sharing needed
- Fast updates without Redux overhead
- Simple to understand and maintain

**State Location:**
- All in `PatientsPageClient.tsx`
- Props passed down to children
- Callbacks passed for updates
- Memoized computed values

**Future Considerations:**
When adding Supabase:
- Consider React Query for data fetching
- Server state (from Supabase) separate from UI state
- Cache management for large datasets
- Optimistic updates for better UX

---

This architecture provides:
✅ Clear separation of concerns
✅ Unidirectional data flow
✅ Easy to test components
✅ Simple to add new features
✅ Ready for Supabase integration
