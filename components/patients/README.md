# Patient Data Tracker

A comprehensive patient data management system for clinical trials, built with Next.js 14, TypeScript, and Shadcn UI components.

## Features

### 1. CSV Upload & Import
- **Drag-and-drop interface** for uploading patient data CSV files
- **Real-time CSV parsing** using PapaParse library
- **Data preview** before confirmation
- **File validation** with error handling
- Monthly data upload support

### 2. Interactive Data Table
- **Horizontal scrolling** to view all 140+ columns
- **Sticky first column** (Patient ID) for easy reference
- **Sticky header row** while scrolling vertically
- **Scroll shadow indicators** for better UX
- **Responsive design** with mobile support
- **Color-coded values** (Green/Yellow/Red status indicators)
- **Compact 10px text** for maximum data density

### 3. Column Management

#### Editable Headers
- **Click-to-edit** column labels inline
- **Escape/Enter** to cancel/save changes
- **Hover tooltips** showing original column names
- **Persistent custom labels** throughout session

#### Column Visibility
- **Show/Hide columns** via dialog
- **Grouped by category**:
  - Demographics
  - Visit Information
  - Clinical Measurements
  - Adverse Events
  - Other
- **Bulk operations** (Show All / Hide All)
- **Category-level toggles**

### 4. Advanced Filtering

#### Global Search
- Search across all columns simultaneously
- Real-time filtering as you type
- Clear button for quick reset

#### Column-Specific Filters
- **Categorical filters** for:
  - Sex (Male/Female)
  - Site Name (Incor, Healthycore, Chapidze hospital, etc.)
  - NYHA Classification
  - Status indicators
- **Quick filter chips** for common selections
- **Collapsible filter panel** to save screen space
- **Active filter indicator**

### 5. Data Display Features
- **Empty cell handling** (displays "—")
- **Date formatting** (converts to readable format)
- **Long text truncation** with tooltips
- **Patient count display** (rows × columns)
- **Upload timestamp tracking**

## File Structure

```
app/protected/patients/
  └── page.tsx                          # Server component with auth

components/patients/
  ├── patients-page-client.tsx          # Main client component with state management
  ├── patients-navbar.tsx               # Navigation menu
  ├── csv-upload-dialog.tsx             # CSV upload interface
  ├── patient-data-table.tsx            # Main data table with scrolling
  ├── editable-table-header.tsx         # Inline header editing
  ├── patient-filters.tsx               # Filter controls
  └── column-visibility-toggle.tsx      # Column show/hide dialog

lib/
  ├── types/patient-data.ts             # TypeScript interfaces
  └── mock-data/patient-data.ts         # Dummy data (10 sample patients)
```

## Usage

### Accessing the Patient Data Tracker

Navigate to `/protected/patients` in your browser (requires authentication).

### Uploading Patient Data

1. Click the **"Upload Patient Data"** button
2. Drag and drop a CSV file or click to browse
3. Review the data preview (first 5 rows)
4. Click **"Upload Data"** to confirm

The CSV should match the structure from your clinical trial export with columns like:
- `SubjectId`
- `E01_V1[1].SCR_01.VS[1].SEX`
- `E01_V1[1].SCR_01.VS[1].AGE`
- `SiteName`
- Visit dates, measurements, adverse events, etc.

### Filtering Data

1. Use the **global search** box to search across all columns
2. Click **"Expand"** to access column-specific filters
3. Select values from dropdowns or click quick filter chips
4. Click **"Clear All Filters"** to reset

### Customizing Column Labels

1. **Hover** over any column header
2. **Click** the header or pencil icon
3. **Type** your new label
4. Press **Enter** to save or **Escape** to cancel

### Managing Column Visibility

1. Click the **"Columns"** button (shows count like "Columns (82/140)")
2. Check/uncheck individual columns
3. Use **"Show All"** or **"Hide All"** for bulk operations
4. Toggle entire categories at once
5. Click outside the dialog to close

## Data Structure

The system handles clinical trial data with these key categories:

- **Demographics**: Patient ID, Sex, Age, BMI, BSA
- **Site Information**: Site Name, Hospital ID, Company ID
- **Visit Data**: Multiple visit dates (screening, procedure, follow-ups)
- **Clinical Measurements**: 
  - LVEF percentages
  - LVEDV/LVESV values
  - Mean gradients
  - MR grades
  - NYHA classifications
  - BNP levels
  - 6-minute walk test distances
- **Adverse Events**: Event descriptions, dates, outcomes
- **Data Lock Status**: Per-visit data locking indicators

## Styling

The interface follows a **slim, modern design** with:
- **10px base text size** (`text-[10px]`) for data density
- **Minimal padding** (1-2px) on table cells
- **Subtle borders** using theme colors
- **Compact controls** with small button sizes
- **1400px max width** container (matches dashboard)
- **Consistent spacing** with dashboard layout

## Future Enhancements (Supabase Integration)

The codebase is structured for easy Supabase integration:

```typescript
// Placeholder in patients-page-client.tsx
// TODO: Replace with Supabase data fetching
const [data, setData] = useState<PatientRecord[]>(mockPatientData);

// Future implementation:
// const { data } = await supabase
//   .from('patient_data')
//   .select('*')
//   .order('SubjectId');
```

Comments throughout indicate where Supabase calls will be added for:
- Fetching patient data
- Storing uploaded CSVs
- Persisting column configurations
- Saving user filter preferences

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **PapaParse** - CSV parsing
- **Lucide React** - Icons
- **Radix UI** - Accessible primitives

## Performance Considerations

- **Client-side filtering** for instant results
- **Memoized computed values** to prevent unnecessary re-renders
- **Virtualization-ready** structure (can add react-window if needed)
- **Efficient re-renders** with proper React keys
- **Lazy loading** of dialog content

## Accessibility

- **Keyboard navigation** (Tab, Enter, Escape)
- **ARIA labels** on interactive elements
- **Tooltip descriptions** for truncated content
- **Focus management** in dialogs
- **Screen reader support** via semantic HTML

---

Built with care for clinical trial data management needs.
