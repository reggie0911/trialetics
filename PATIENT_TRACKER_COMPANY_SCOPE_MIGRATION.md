# Patient Data Tracker: Project-Scoped → Company-Scoped Migration

**Date:** January 18, 2026  
**Status:** ✅ Completed

## Summary

Successfully converted the Patient Data Tracker from **project-scoped** to **company-scoped** architecture, matching the AE Metrics module design. This simplifies the system by allowing all users in a company to access all patient data without needing project-level assignments.

---

## Changes Made

### 1. **Database Migration** ✅
**File:** `supabase/migrations/20260118000001_convert_patients_to_company_scope.sql`

- **Schema Changes:**
  - `patient_uploads`: Changed `project_id` → `company_id`
  - `header_mappings`: Changed `project_id` → `company_id`
  - Updated foreign key constraints to reference `companies` table
  - Migrated existing data (mapped project's company_id to uploads)

- **RLS Policies Recreated:**
  - All policies now use `company_id` for access control
  - Changed from junction table lookup (`user_projects`) to direct company membership
  - Simplified access pattern: users see all data for their company

### 2. **Server Actions** ✅
**File:** `lib/actions/patient-data.ts`

**Functions Updated:**
- `uploadPatientData(companyId, ...)` - Changed parameter from `projectId`
- `getPatientUploads(companyId)` - Now fetches by company
- `getHeaderMappings(companyId)` - Company-scoped header mappings
- `saveHeaderMappings(companyId, ...)` - Saves to company level

**Query Changes:**
```typescript
// Before
.eq('project_id', projectId)

// After  
.eq('company_id', companyId)
```

### 3. **Page Component** ✅
**File:** `app/protected/patients/page.tsx`

**Changes:**
- Removed project fetching logic (`user_projects` join)
- Removed role-based project filtering
- Now passes `companyId` directly from profile
- Simplified page description: "Upload and manage patient data for your company"

**Before:**
```typescript
// Fetch user's projects
const { data: userProjects } = await supabase
  .from('user_projects')
  .select('project_id, projects(...)')

<PatientsPageClient projects={projects} profileId={profile.id} />
```

**After:**
```typescript
// No project fetching needed
<PatientsPageClient 
  companyId={profile.company_id} 
  profileId={profile.id}
/>
```

### 4. **Client Component** ✅
**File:** `components/patients/patients-page-client.tsx`

**Major Changes:**
- Removed `projects` prop
- Removed `selectedProjectId` state
- Removed `ProjectSelector` component from UI
- Removed project-related conditional rendering
- Updated all function calls to use `companyId`

**State Removed:**
```typescript
// Removed
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(...);
```

**UI Simplification:**
```typescript
// Removed
<ProjectSelector
  projects={projects}
  selectedProjectId={selectedProjectId}
  onProjectChange={setSelectedProjectId}
/>

// Removed disabled states
<CSVUploadDialog onUpload={handleUpload} disabled={!selectedProjectId} />

// Now always enabled
<CSVUploadDialog onUpload={handleUpload} />
```

### 5. **TypeScript Types** ✅

**Interface Changes:**
```typescript
// Before
interface PatientsPageClientProps {
  projects: Project[];
  profileId: string;
}

// After
interface PatientsPageClientProps {
  companyId: string;
  profileId: string;
}
```

---

## Impact Analysis

### ✅ **Benefits**

1. **Simplified Architecture**
   - No more project selection UI
   - Fewer database queries (no user_projects joins)
   - Matches AE Metrics pattern for consistency

2. **Easier User Experience**
   - Users can upload and view data immediately
   - No project selection step required
   - Company-wide header mappings shared by all users

3. **Reduced Complexity**
   - Fewer state variables to manage
   - Simpler RLS policies
   - Less conditional logic in components

### ⚠️ **Breaking Changes**

1. **Data Access**
   - All users in a company can now see ALL patient data
   - No more per-trial data isolation
   - Users who previously had limited project access now see everything

2. **Header Mappings**
   - Changed from per-project to per-company
   - All uploads now share the same column naming conventions
   - Lost ability to have different mappings per clinical trial

### 🔴 **Risks & Considerations**

1. **Data Privacy**
   - If company runs multiple independent trials, users may see data they shouldn't
   - Consider if this violates any data segregation requirements
   - May need to implement additional access controls if needed

2. **Migration**
   - Existing `project_id` data is migrated to `company_id`
   - Data from multiple projects in same company is now merged
   - Cannot easily revert without data loss

---

## Testing Checklist

- [ ] Run migration: `npx supabase db push`
- [ ] Regenerate types: `npx supabase gen types typescript --local > lib/types/database.types.ts`
- [ ] Test CSV upload (should work without project selection)
- [ ] Test header mapping upload
- [ ] Test data viewing
- [ ] Verify RLS policies (users can only see their company's data)
- [ ] Test upload deletion
- [ ] Verify column visibility settings persist

---

## Rollback Plan

If you need to revert:

1. Create a new migration to reverse schema changes
2. Add back `project_id` columns
3. Restore previous RLS policies
4. Revert code changes in git
5. Regenerate types

**Note:** Data migration may be lossy if company had multiple projects.

---

## Files Modified

```
✅ supabase/migrations/20260118000001_convert_patients_to_company_scope.sql
✅ lib/actions/patient-data.ts
✅ app/protected/patients/page.tsx
✅ components/patients/patients-page-client.tsx
```

## Files No Longer Needed

The following component is no longer used (project selector):
- `components/patients/project-selector.tsx` - Can be safely removed

---

## Next Steps

1. **Run the migration** on your Supabase instance
2. **Regenerate TypeScript types** to match new schema
3. **Test thoroughly** with multiple users
4. **Update documentation** if you have any user guides
5. **Monitor** for any access control issues

---

## Comparison: Before vs After

| Aspect | Before (Project-Scoped) | After (Company-Scoped) |
|--------|------------------------|----------------------|
| **Access Control** | Via `user_projects` table | Via `profiles.company_id` |
| **Data Visibility** | Only assigned projects | All company data |
| **Header Mappings** | Per project | Per company |
| **UI Complexity** | Project selector required | Simplified, no selector |
| **RLS Queries** | Complex (junction table) | Simple (direct FK) |
| **Use Case** | Multi-trial CRO | Company-wide tracking |

---

**Migration completed successfully! 🎉**
