# Loading Indicators Implementation

## Summary

Added comprehensive loading indicators for both patient data upload and header mapping upload with status messages and smooth transitions.

## Changes Made

### 1. Patient Data Upload Loading (patients-page-client.tsx)

**New State:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState("");
```

**Loading Stages:**
1. "Processing patient data..." (initial)
2. "Filtering columns based on header mapping..." (when header mapping exists)
3. "Configuring columns..." (setting up column structure)
4. "Calculating visit group spans..." (for multi-level headers)
5. "Upload complete!" (success message)

**Full-Screen Loading Overlay:**
- Backdrop blur effect
- Centered loading spinner
- Dynamic status messages
- Auto-dismisses after completion or error

**Error Handling:**
- Shows error message for 2 seconds before dismissing
- Console logs error details for debugging

**Success Flow:**
- Shows "Upload complete!" message
- Waits 500ms before dismissing
- Smooth transition back to table view

### 2. Header Mapping Upload Loading (header-mapping-upload.tsx)

**New State:**
```typescript
const [isProcessing, setIsProcessing] = useState(false);
```

**In-Dialog Loading:**
- Spinner replaces upload area during processing
- "Processing header mapping..." message
- Upload controls disabled during processing
- Brief success delay before dialog closes

**Error Handling:**
- Error message displayed in dialog
- User can retry without closing dialog
- Processing state clears on error

## Visual Experience

### Patient Data Upload

**Before Upload:**
```
┌─────────────────────────┐
│  Upload CSV Dialog      │
│  - Select file          │
│  - Preview data         │
│  [Upload Data] button   │
└─────────────────────────┘
```

**During Upload:**
```
╔═══════════════════════════════╗
║   Full-screen overlay         ║
║                               ║
║       ⟳ Spinner               ║
║   "Processing patient data"   ║
║                               ║
╚═══════════════════════════════╝
```

**After Upload:**
```
╔═══════════════════════════════╗
║   Full-screen overlay         ║
║                               ║
║       ✓                       ║
║   "Upload complete!"          ║
║   (auto-dismisses)            ║
╚═══════════════════════════════╝
```

### Header Mapping Upload

**During Processing:**
```
┌─────────────────────────────┐
│ Upload Header Mapping CSV   │
├─────────────────────────────┤
│                             │
│        ⟳ Spinner            │
│  "Processing header         │
│   mapping..."               │
│                             │
└─────────────────────────────┘
```

## Timing

- **Initial delay**: 300ms (shows loading state even for fast operations)
- **Success message**: 500ms display time
- **Error message**: 2000ms display time
- **Dialog auto-close**: After success message

## Key Features

### Full-Screen Overlay
- ✅ Backdrop blur for focus
- ✅ Prevents interaction during processing
- ✅ z-index 50 (above all content)
- ✅ Smooth fade-in/fade-out

### Spinner Animation
- ✅ Rotating border animation
- ✅ Primary color theme
- ✅ 12px size (visible but not intrusive)

### Status Messages
- ✅ Clear, action-oriented text
- ✅ Updates in real-time
- ✅ Shows current processing step
- ✅ Success confirmation

### Error Handling
- ✅ Error messages stay visible longer
- ✅ Console logging for debugging
- ✅ User can see what went wrong
- ✅ Graceful recovery

## User Experience Flow

### Scenario 1: Upload Patient Data (with header mapping already loaded)
```
1. User clicks "Upload CSV"
2. Selects patient data file
3. Clicks "Upload Data"
4. [Loading appears] "Processing patient data..."
5. [Loading updates] "Filtering columns based on header mapping..."
6. [Loading updates] "Configuring columns..."
7. [Loading updates] "Calculating visit group spans..."
8. [Loading updates] "Upload complete!" ✓
9. [Loading disappears after 500ms]
10. Table displays with multi-level headers
```

### Scenario 2: Load Header Mapping
```
1. User clicks "Load Header Map"
2. Selects header mapping CSV
3. Dialog opens with file selected
4. [In-dialog loading] ⟳ "Processing header mapping..."
5. [Brief pause]
6. Dialog closes automatically
7. Button updates: "Loaded: filename.csv"
```

### Scenario 3: Error During Upload
```
1. User uploads file
2. [Loading appears] "Processing patient data..."
3. Error occurs
4. [Loading updates] "Error processing data"
5. Error logged to console
6. [Loading disappears after 2 seconds]
7. User can try again
```

## Files Modified

1. **components/patients/patients-page-client.tsx**
   - Added full-screen loading overlay
   - Made `handleUpload` async
   - Added loading states and messages
   - Added error handling with delays

2. **components/patients/header-mapping-upload.tsx**
   - Added in-dialog loading spinner
   - Made processing async with state
   - Disabled controls during processing
   - Auto-close on success

## Accessibility

- ✅ Loading states prevent accidental re-submission
- ✅ Clear status messages inform users of progress
- ✅ Error messages are descriptive
- ✅ Keyboard navigation still works (dialog controls)

## No Linter Errors

All changes compile successfully with TypeScript. ✅
